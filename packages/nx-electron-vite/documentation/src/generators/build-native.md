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
