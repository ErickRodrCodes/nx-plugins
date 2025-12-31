---
mermaidTheme: forest
---

# Production Builds

Creating production-ready Electron applications with `nx-electron-vite` involves building your frontend application, the Electron host, generating icons, and packaging everything into distributable installers.

## Quick Start

To create a production build of your Electron application:

::: code-group

```bash [nx]
nx dist <your-electron-project>
```

:::

This single command orchestrates the entire production build process automatically.

## Build Process Overview

The `dist` target runs a sophisticated build pipeline:

![Build Pipeline](/images/build-pipeline.svg)

### Build Dependencies

The `dist` target automatically handles dependencies:

1. **Frontend Build**: Builds your guest project for production
2. **Electron Build**: Builds the Electron main process
3. **Icons**: Generates all required icons (`nx-electron-icons`)
4. **Packaging**: Uses `electron-builder` to create installers

## Understanding the Build Targets

### `dist` Target (Production)

- **Purpose**: Creates distributable application packages
- **Executor**: `@erickrodrcodes/nx-electron-vite:build-electron`
- **Output**: Platform-specific installers (`.exe`, `.dmg`, `.AppImage`, etc.)

### `build` Target (Host Only)

- **Purpose**: Builds just the Electron main process
- **Executor**: `@nx/vite:build`
- **Output**: Built JavaScript files for the Electron host

## Platform Support

The build system automatically creates packages for your current platform:

| Platform    | Output Formats                        |
| ----------- | ------------------------------------- |
| **Windows** | `.exe` installer, portable executable |
| **macOS**   | `.dmg` disk image, `.app` bundle      |
| **Linux**   | `.AppImage`, `.deb`, `.snap` packages |

## Build Configuration

The production build uses `electron-builder.yml` in your project's `src/` directory:

```yaml
# Key configuration sections
appId: your-app.electron.app
productName: Your App Name
directories:
  buildResources: build
files:
  - '!**/*'
  - '!dist/apps/your-guest-project-electron/package.json'
  - 'dist/apps/your-guest-project' # Frontend build
  - 'dist/apps/your-guest-project-electron' # Electron host
  - 'dist/apps/your-guest-project-icons' # Generated icons
```

### Important Build Behavior

::: info Build Process Improvements
The build process uses a **temporary configuration file** (`electron-builder.{projectName}.temp.json`) that extends your project's `electron-builder.yml`. This temporary file is automatically created at the workspace root and cleaned up after the build completes.

**Key Benefits**:

- ✅ Your workspace `package.json` is **never modified**
- ✅ Multiple builds can run safely in parallel
- ✅ Cleaner git status and safer CI/CD pipelines
- ✅ Application metadata (`name`, `version`, `author`, `description`) is injected via `extraMetadata`

The temporary config file is automatically deleted after build completion (success or failure).
:::

## How the Build Process Works

The `build-electron` executor uses a sophisticated approach to package your application without modifying your workspace:

### Temporary Configuration Approach

1. **Temporary Config Creation**: A `electron-builder.{projectName}.temp.json` file is created at the workspace root (e.g., `electron-builder.my-app-electron.temp.json`)
2. **Config Extension**: This temporary config extends your project's `electron-builder.yml`
3. **Metadata Injection**: Application metadata is injected via `extraMetadata`:
   - `name`: Your Electron host project name
   - `version`: Set to `0.0.0` (override in your `electron-builder.yml` if needed)
   - `author`: From your project setup
   - `description`: From your project setup
   - `main`: Path to your built main process file
4. **Build Execution**: `electron-builder` runs with the temporary config
5. **Automatic Cleanup**: The temporary config file is deleted (even if build fails)

**Example of Generated Temporary Config**:

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

This approach ensures your workspace remains clean and builds are isolated.

## Output Structure

After a successful build, you'll find files organized as follows:

```
workspace-root/
├── dist/
│   └── apps/
│       ├── your-guest-project/              # Built frontend
│       ├── your-guest-project-electron/     # Built Electron host
│       └── your-guest-project-icons/        # Generated icons
└── [Platform-specific installers]           # .exe, .dmg, etc. (in root)
```

## Build Optimization

### Production vs Development

| Aspect                 | Development                 | Production                          |
| ---------------------- | --------------------------- | ----------------------------------- |
| **Bundle Size**        | Larger (includes dev tools) | Minimized and optimized             |
| **Source Maps**        | Full source maps            | Minimal/none                        |
| **Asset Optimization** | Disabled                    | Enabled (minification, compression) |
| **Security**           | Dev tools enabled           | Hardened for distribution           |

### Build Performance

- **Nx Caching**: Production builds leverage Nx's computation cache
- **Incremental Builds**: Only rebuilds changed dependencies
- **Parallel Processing**: Icons and builds can run in parallel when possible

## Customization

### Modifying Build Configuration

::: warning Configuration Complexity
It is **not advisable** to modify the `electron-builder.yml` file without deep knowledge of `electron-builder`. The generated boilerplate provides a working configuration that covers most use cases.
:::

#### Critical Path Verification

The most important configuration to verify is the **guest frontend build path**. Since `nx-electron-vite` cannot detect which frontend technology you're using, you must ensure the paths in `electron-builder.yml` match your guest project's build output.

::: info Future Enhancement
We are actively working on an **autodetection feature** that will automatically identify your frontend framework and configure the correct build paths. Until this feature is available, manual verification of the output path is required.
:::

**Common Framework Variations:**

| Framework   | Default Build Output         | Required Action                                                                          |
| ----------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| **Angular** | `dist/apps/project/browser/` | Modify `electron-builder.yml` or adjust Angular's `outputPath` on guest's `project.json` |
| **React**   | `dist/apps/project/`         | ✅ Works with default configuration                                                      |
| **Vue**     | `dist/apps/project/`         | ✅ Works with default configuration                                                      |
| **Svelte**  | `dist/apps/project/`         | ✅ Works with default configuration                                                      |

**Example Fix for Angular:**

```yaml
# In electron-builder.yml
files:
  - 'dist/apps/your-guest-project/browser' # Add /browser for Angular
  - 'dist/apps/your-guest-project-electron'
  - 'dist/apps/your-guest-project-icons'
```

**Alternative: Adjust Angular Output Path:**

```json
// In your Nx Angular project's project.json
"build": {
  "executor": "@angular-devkit/build-angular:application",
  "outputs": ["{options.outputPath}"],
  "options": {
    "outputPath": {
      "base": "dist/apps/your-guest-project",
      "browser": ""
    }
  }
}
```

#### Safe Customization Options

Only modify these sections if absolutely necessary:

- **App metadata** (name, description, author)
- **Icon paths** (if using custom locations)
- **File inclusion patterns** (for framework-specific build outputs)

::: tip Linux Icon Format
The generated `electron-builder.yml` template uses `.ico` format for Linux icons, but Linux typically uses `.png` format. This is a known issue in the template that will be addressed in future versions.
:::

Avoid modifying platform-specific settings or advanced electron-builder options unless you have extensive experience with the tool.

### Build Scripts Integration

The build process integrates with your existing Nx workspace:

```bash
# Build with affected projects
nx affected --target=dist

# Build with custom configuration
nx dist your-project --configuration=production
```

## Troubleshooting

### Common Build Issues

**Build Fails with "Package.json not found"**

- Ensure your guest project builds successfully first: `nx build <guest-project>`
- Verify the guest project's build output path matches the `files` section in `electron-builder.yml`

**Icons Missing in Final Package**

- Verify icon source files exist: `src/resources/icon/source/icon.png` and `src/resources/icon/source/setup.png`
- Run icons generation manually: `nx nx-electron-icons <your-electron-project>`
- Check that generated icons exist in `dist/apps/<your-electron-project>-icons/`

**Large Bundle Size**

- Review the `files` section in `electron-builder.yml`
- Exclude unnecessary files and directories

**Platform-Specific Issues**

- Windows: Ensure Node.js and npm/pnpm are properly installed
- macOS: Check Xcode command line tools are available
- Linux: Verify required system packages are installed

### Build Validation

Before distributing, test your build:

1. **Install locally**: Test the generated installer
2. **Run on clean system**: Verify all dependencies are included
3. **Check file associations**: Ensure proper file type handling
4. **Test auto-updater**: If enabled, verify update mechanism works

## Next Steps

Once you have a working production build:

- [Digital Signing Applications](/digital-signing) for trusted distribution
- [Native Module Integration](/generators/build-native) for platform-specific functionality
- Test your application on target platforms before distribution
