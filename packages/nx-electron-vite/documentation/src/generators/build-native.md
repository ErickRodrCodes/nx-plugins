# Generator: build-native

The `build-native` generator builds and integrates native Node.js modules for Electron by rebuilding them against the correct Electron ABI and copying the binaries to your host project.

## Usage

```bash
nx g @erickrodrcodes/nx-electron-vite:build-native
```

## What it does

- Uses `@electron/rebuild` to compile native modules against the correct Electron ABI version
- Copies `.node` binaries to the `src/main/native/` directory in your host project
- Updates the `reference.json` file to track native modules and their versions
- Configures the build system to include native modules in the final distribution

## Options

| Option           | Type     | Required | Description                                                     |
| ---------------- | -------- | -------- | --------------------------------------------------------------- |
| `npmPackageName` | `string` | ✅       | The npm package containing the native module to build           |
| `hostProject`    | `string` |          | Target Electron host project name (defaults to current project) |
| `pathTarget`     | `string` |          | Custom path where the .node binary should be copied             |

## How it works

1. **Validates** the npm package exists in node_modules
2. **Rebuilds** the native module using `@electron/rebuild` with the correct Electron version
3. **Locates** the generated `.node` binary file
4. **Copies** the binary to `src/main/native/` in your host project
5. **Updates** `src/main/native/reference.json` with module information
6. **Configures** the build process to include the native module in distributions

## Example

```bash
# Add better-sqlite3 native module to your Electron app
nx g @erickrodrcodes/nx-electron-vite:build-native --hostProject=my-app-electron --npmPackageName=better-sqlite3
```

This will rebuild `better-sqlite3` against your Electron version and make it available in your main process.

## Using Native Modules in Your Code

After running the `build-native` generator, the `.node` binary lives at `src/main/native/` in your host project. Since `.node` files are compiled binaries (not JavaScript modules), you cannot import them directly. Instead, you configure the package to load the native binary from a custom path.

::: warning Source location ≠ runtime location
`src/main/native/` is where the binary is **stored in your repository**. It is not where your code
loads it from at runtime.

During the build, the `copyNative` Vite plugin copies each binary listed in `reference.json`
**flat into your main process output directory**, next to the compiled `main.cjs` — there is no
`native/` subfolder in the build output. Resolve the binary relative to `__dirname` and nothing
else.
:::

### Understanding the Native Module Pattern

Native Node.js modules consist of two parts:

1. **JavaScript wrapper** - The npm package you import (e.g., `better-sqlite3`)
2. **Native binary** - The compiled `.node` file containing platform-specific code

Normally, the JavaScript wrapper automatically locates its `.node` binary. However, in Electron apps (especially when bundled with Vite), the default resolution may fail. The solution is to explicitly tell the package where to find its native binary.

### Example: Using better-sqlite3

The `better-sqlite3` package accepts a `nativeBinding` option that specifies the path to its compiled binary:

```typescript
// src/main/main.ts
import Database from 'better-sqlite3';
import { join } from 'node:path';

// The binary sits next to the compiled main process, not in a native/ subfolder.
const db = new Database('my-database.sqlite', {
  nativeBinding: join(__dirname, 'better-sqlite3.node'),
});

// Use the database normally
const rows = db.prepare('SELECT * FROM users').all();
```

::: danger Do not use `import.meta.url` in the main process
The main process is emitted as CommonJS (`main.cjs`), so use Node's `__dirname` directly.

Vite/Rolldown's CommonJS transform rewrites `fileURLToPath(import.meta.url)` into
`fileURLToPath({}.url)`, which evaluates to `undefined` and **crashes the packaged app on
startup**. The generated `main.ts` declares `__dirname` for exactly this reason.
:::

::: tip Finding the Binary Name
The filename is derived from the npm package name, so `better-sqlite3` produces
`better-sqlite3.node` (hyphens), not `better_sqlite3.node`. Check
`src/main/native/reference.json` for the exact value rather than guessing:

```json
{
  "better-sqlite3": {
    "path": "better-sqlite3.node",
    "version": "13.0.3"
  }
}
```

The `path` field is the filename to pass to `join(__dirname, …)`, and `version` records the
package version the binary was built from.
:::

### Other Native Modules

Each native module has its own way of accepting a custom binding path. Check the module's documentation for the appropriate option:

| Module             | Option/Method                                   |
| ------------------ | ----------------------------------------------- |
| `better-sqlite3`   | `nativeBinding` option in constructor           |
| `sqlite3`          | `SQLITE_LIBRARY_PATH` environment variable      |
| `sharp`            | Automatic discovery (may need `SHARP_DIST_DIR`) |
| `@nodegui/nodegui` | Uses `NODEGUI_NODE_MODULE_DIR`                  |

### Why This Pattern?

When Vite bundles your Electron main process:

1. It transforms and relocates your JavaScript files
2. Native modules can't find their `.node` binaries via normal resolution
3. By copying the binary to a known location and explicitly configuring the path, we ensure the module works correctly in both development and production

### Production Builds

No additional configuration is needed—your native modules work in packaged apps just as they do in
development—but it is worth knowing the three steps involved, because the final path differs from
your source layout:

1. **Vite** — the `copyNative` plugin reads `src/main/native/reference.json` and copies each binary
   flat into the main process output directory, beside `main.cjs`.
2. **electron-builder** — `electron-builder.yml` lists that output directory under `files`, so the
   binaries are packaged with your app.
3. **asar** — `asarUnpack` includes `**/*.node`, because native addons cannot be `dlopen`ed from
   inside an asar archive. They are extracted to `app.asar.unpacked/`.

The result in a packaged app looks like this:

```
resources/app.asar.unpacked/<mainOutputPath>/better-sqlite3.node
```

Because `__dirname` resolves inside `app.asar.unpacked` at runtime, the same
`join(__dirname, 'better-sqlite3.node')` works in development and in the packaged app.
