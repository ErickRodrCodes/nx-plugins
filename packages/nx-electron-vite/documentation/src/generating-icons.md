# Generating Icons

The `nx-electron-vite` plugin provides automated icon generation for your Electron application using the `build-icon` executor. This feature converts your source images into all the required formats and sizes for different platforms and installers.

## Quick Start

To generate icons for your Electron application:

::: code-group

```bash [Generate All Icons]
nx nx-electron-icons [your-electron-project]
```

:::

This command generates both application icons and installer icons from your source images.

## Icon Source Requirements

### Default Icon Structure

When you scaffold a project, the following icon structure is created:

```
your-electron-project/
├── src/
│   └── resources/
│       └── icon/
│           └── source/
│               ├── icon.png      # Main application icon
│               └── setup.png     # Installer icon
```

### Image Requirements

- **Format**: PNG files **with transparent background**
- **Required Files**: Both `icon.png` and `setup.png` are required to generate the respective icons
- **Recommended size**: 1024x1024 pixels at 72 DPI for both files
  - **Why 1024x1024?** To be honest, no one wants pixelated icons. Starting with high resolution ensures crisp icons at all sizes.

**⚠️ Critical**: Always use transparent backgrounds in your PNG files. Solid backgrounds will appear as unwanted colored squares around your icon on different platforms and themes.

## Icon Generation Modes

The `build-icon` executor supports three different modes:

### Composite Mode (Default)

Generates both application and installer icons:

::: code-group

```bash [Composite]
nx nx-electron-icons [your-electron-project]
# or explicitly
nx nx-electron-icons [your-electron-project] --configuration=default
```

:::

### App Icon Only

Generates only the application icons:

::: code-group

```bash [App Only]
nx nx-electron-icons [your-electron-project] --configuration=app
```

:::

### Setup Icon Only

Generates only the installer icons:

::: code-group

```bash [Setup Only]
nx nx-electron-icons [your-electron-project] --configuration=setup
```

:::

## Generated Icon Formats

The icon generator creates platform-specific formats automatically:

### Windows Icons

- **`.ico`** files in multiple sizes (16x16, 32x32, 48x48, 256x256)
- Used for application executable and taskbar
- Setup icons for installer

### macOS Icons

- **`.icns`** files with multiple resolutions
- Supports Retina displays with high-DPI variants
- Used for application bundle and Dock

### Linux Icons

- **`.png`** files in standard sizes (16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512)
- Used for desktop entries and window managers

## Icon Output Location

Generated icons are placed in your project's distribution folder:

```
dist/
└── [your-electron-project]/
    └── icons/
        ├── win/
        │   ├── icon.ico
        │   └── setup.ico
        ├── mac/
        │   ├── icon.icns
        │   └── setup.icns
        └── png/
            ├── 16x16.png
            ├── 32x32.png
            ├── 48x48.png
            └── ... (all sizes)
```

## Integration with Build Process

Icon generation is automatically integrated into your production build workflow:

1. **Automatic Dependency**: The `dist` target depends on `nx-electron-icons`
2. **Build Order**: Icons are generated before the final application packaging
3. **electron-builder Integration**: Generated icons are automatically used by electron-builder

## Customizing Icon Generation

### Custom Source Paths

You can customize the source icon paths in your project configuration. The default paths can be modified in your `project.json`:

```json
{
  "targets": {
    "nx-electron-icons": {
      "options": {
        "iconOutputPath": "custom/path/to/icons",
        "mode": "composite"
      }
    }
  }
}
```

### Custom Icon Sizes

The icon generator uses the `png2icons` library, which automatically creates all standard sizes. Custom size requirements should be handled by modifying the source images to ensure optimal quality.

## Best Practices

### Source Image Quality

- **Transparent background**: **Essential!** Use PNG with transparency to avoid colored squares
- **Use vector graphics** when possible (convert to high-res PNG with transparency)
- **Square aspect ratio**: Icons should be perfectly square
- **High resolution**: Start with at least 1024x1024 for best results
- **Simple designs**: Complex details may not be visible at small sizes

### File Organization

- Keep source files in version control
- Use descriptive names for different icon variants
- Consider creating separate icons for development vs production

## Troubleshooting

Encountering issues with icon generation? See the [Troubleshooting](/troubleshooting#icon-generation-issues) page for solutions to common problems including:

- Icon generation failures
- Quality issues at small sizes
- Icons not updating in builds

## Next Steps

Once you've generated your icons, you're ready for:

- [Production Builds](/production-builds) to create distributable applications with your custom icons
- [Native Module Integration](/generators/build-native) for advanced functionality
