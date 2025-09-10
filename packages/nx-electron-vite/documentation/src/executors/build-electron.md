# Executor: build-electron

The `build-electron` executor creates distributable Electron applications using electron-builder. It packages your built Electron host project into platform-specific installers and executables.

## Usage

```bash
nx run my-app-electron:dist
```

## What it does

- Temporarily modifies the workspace `package.json` to configure electron-builder
- Executes electron-builder with the project-specific configuration from `electron-builder.yml`
- Creates platform-specific distributables (installers, executables, packages)
- Automatically restores the workspace `package.json` after the build

## Options

| Option               | Type     | Required | Description                                                |
| -------------------- | -------- | -------- | ---------------------------------------------------------- |
| `hostProject`        | `string` | ✅       | Name of the Electron host project to build                 |
| `hostProjectRoot`    | `string` | ✅       | Relative path to the host project root directory           |
| `mainOutputPath`     | `string` | ✅       | Relative path to the main process output directory         |
| `mainOutputFilename` | `string` | ✅       | Name of the main process output file (typically `main.js`) |
| `author`             | `string` |          | Author name for the application metadata                   |
| `description`        | `string` |          | Description for the application metadata                   |

## Important Notes

⚠️ **Critical Warning**: Never run this executor in parallel with other nx-electron-vite builders due to temporary package.json modifications.

The executor temporarily modifies your workspace's root `package.json` to set the main entry point for electron-builder, then restores it after the build completes.

## Output

The executor generates platform-specific distributables in the `dist` directory based on your `electron-builder.yml` configuration:

- **Windows**: `.exe` installer, portable executable
- **macOS**: `.dmg` disk image, `.app` application bundle
- **Linux**: `.AppImage`, `.deb`, `.snap` packages
