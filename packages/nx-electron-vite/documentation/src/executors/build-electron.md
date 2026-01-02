# Executor: build-electron

The `build-electron` executor creates distributable Electron applications using electron-builder. It packages your built Electron host project into platform-specific installers and executables.

## Usage

```bash
nx run my-app-electron:dist
```

## How It Works

The executor uses a **temporary configuration composition pattern** that preserves workspace integrity:

1. **Creates a project-specific temporary config** (`electron-builder.{projectName}.temp.json`) at the workspace root
2. **Extends** your project's `electron-builder.yml` configuration
3. **Injects metadata** via `extraMetadata` (name, version, author, description, main entry point)
4. **Executes electron-builder** with the temporary configuration
5. **Automatically cleans up** the temporary file after build (success or failure)

::: info Workspace Integrity
Your workspace `package.json` is **never modified**. All metadata injection happens through the temporary configuration file, enabling safe parallel builds of multiple Electron projects.
:::

## Options

| Option               | Type     | Required | Description                                                 |
| -------------------- | -------- | -------- | ----------------------------------------------------------- |
| `hostProject`        | `string` | ✅       | Name of the Electron host project to build                  |
| `hostProjectRoot`    | `string` | ✅       | Relative path to the host project root directory            |
| `mainOutputPath`     | `string` | ✅       | Relative path to the main process output directory          |
| `mainOutputFilename` | `string` | ✅       | Name of the main process output file (typically `main.cjs`) |
| `author`             | `string` | ✅       | Author name for the application metadata                    |
| `description`        | `string` | ✅       | Description for the application metadata                    |

## Temporary Configuration

The executor generates a temporary configuration file that looks like this:

```json
{
  "extends": "apps/my-app-electron/src/electron-builder.yml",
  "extraMetadata": {
    "main": "dist/apps/my-app-electron/main.cjs",
    "author": "Your Name",
    "description": "Your app description",
    "name": "my-app-electron",
    "version": "0.0.0"
  }
}
```

This approach:

- ✅ Keeps your workspace `package.json` untouched
- ✅ Enables parallel builds of multiple Electron projects
- ✅ Provides clean git status (no build artifacts in workspace files)
- ✅ Creates predictable CI/CD pipelines with no cleanup requirements

## Output

The executor generates platform-specific distributables based on your `electron-builder.yml` configuration:

- **Windows**: `.exe` installer, portable executable
- **macOS**: `.dmg` disk image, `.app` application bundle
- **Linux**: `.AppImage`, `.deb`, `.snap` packages

Output location is determined by your `electron-builder.yml` configuration, typically in a `dist` directory at the workspace root.

## Example Configuration

The `dist` target is automatically configured when you run the `setup-project` generator:

```json
{
  "dist": {
    "executor": "@erickrodrcodes/nx-electron-vite:build-electron",
    "dependsOn": [
      {
        "projects": ["my-app-electron"],
        "target": "nx-electron-icons"
      }
    ],
    "options": {
      "hostProject": "my-app-electron",
      "guestProject": "my-app",
      "hostProjectRoot": "{projectRoot}",
      "mainOutputPath": "dist/apps/my-app-electron",
      "mainOutputFilename": "main.cjs",
      "author": "Your Name",
      "description": "My Electron Application"
    }
  }
}
```
