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

After running the `build-native` generator, the `.node` binary is copied to `src/main/native/` in your host project. Since `.node` files are compiled binaries (not JavaScript modules), you cannot import them directly. Instead, you configure the package to load the native binary from a custom path.

### Understanding the Native Module Pattern

Native Node.js modules consist of two parts:

1. **JavaScript wrapper** - The npm package you import (e.g., `better-sqlite3`)
2. **Native binary** - The compiled `.node` file containing platform-specific code

Normally, the JavaScript wrapper automatically locates its `.node` binary. However, in Electron apps (especially when bundled with Vite), the default resolution may fail. The solution is to explicitly tell the package where to find its native binary.

### Example: Using better-sqlite3

The `better-sqlite3` package accepts a `nativeBinding` option that specifies the path to its compiled binary:

```typescript
// src/main/index.ts
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Point to the native binary in the native/ directory
const db = new Database('my-database.sqlite', {
  nativeBinding: path.join(__dirname, 'native', 'better_sqlite3.node'),
});

// Use the database normally
const rows = db.prepare('SELECT * FROM users').all();
```

::: tip Finding the Binary Name
After running `build-native`, check the `src/main/native/reference.json` file to see the exact filename:

```json
{
  "better-sqlite3": {
    "path": "better_sqlite3.node",
    "version": "11.8.1"
  }
}
```

The `path` field shows the exact binary filename to use.
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

The `build-electron` executor automatically includes the `src/main/native/` directory in the final distribution. No additional configuration is needed—your native modules will work in packaged apps just as they do in development.
