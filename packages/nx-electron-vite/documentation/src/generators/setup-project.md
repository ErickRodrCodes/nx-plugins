# Generator: setup-project

The `setup-project` generator creates a new Electron "host" application that wraps an existing frontend application in your workspace with an Electron shell.

## Usage

```bash
nx g @erickrodrcodes/nx-electron-vite:setup-project
```

## What it does

- Creates a new Electron host project with main process, preload script, and configuration files
- Sets up Nx project configuration with proper targets (build, serve, electron, dist, test)
- Establishes dependency relationships between the host and guest projects
- Generates all required configuration files for Electron development and building

## Options

| Option           | Type                   | Default                   | Required | Description                                                          |
| ---------------- | ---------------------- | ------------------------- | -------- | -------------------------------------------------------------------- |
| `guestProject`   | `string`               | -                         | ✅       | Name of the existing frontend project to wrap with Electron          |
| `name`           | `string`               | -                         | ✅       | Human-readable name for your Electron app (used in window title)     |
| `author`         | `string`               | -                         | ✅       | Author of the electron application                                   |
| `description`    | `string`               | -                         | ✅       | Brief description of the electron application                        |
| `executableName` | `string`               | -                         | ✅       | Name of the executable file (lowercase and dashes only)              |
| `nameProject`    | `string`               | `{guestProject}-electron` |          | Name of the Electron project in Nx graph (lowercase and dashes only) |
| `directory`      | `string`               | workspace apps dir        |          | Directory path to create the electron project                        |
| `test`           | `"none"` \| `"vitest"` | `"none"`                  |          | Testing framework for the main process                               |
| `updater`        | `boolean`              | `false`                   |          | Add auto-updater script to the application configuration             |

## Generated Files

The generator creates a complete Electron project structure:

- `src/main/main.ts` - Main process entry point
- `src/preload/preload.ts` - Preload script for secure IPC communication
- `src/electron-builder.yml` - Electron builder configuration for packaging
- `electron-nx-vite.config.ts` - Main Electron configuration with Vite integration
- `vite.config.ts` - Vite configuration for development and building
- `package.json` - Project-specific package configuration
- `index.html` - Renderer process entry HTML
- `debugme.md` - Project-specific debugging setup guide
- `src/resources/sign-windows.js` - Windows code signing script
- TypeScript configurations (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`)
