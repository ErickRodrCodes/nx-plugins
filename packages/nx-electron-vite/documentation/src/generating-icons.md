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
│               ├── icon.png      # Main application icon (read by the executor)
│               ├── setup.png     # Installer icon (read by the executor)
│               ├── icon.svg      # Editable placeholder artwork
│               ├── icon-o.svg    # Editable placeholder variants
│               ├── icon-o2.svg
│               └── icon.ai
```

The generator ships working placeholder icons, so the target succeeds before you supply your own artwork. Only the two `.png` files are read during generation — the `.svg` and `.ai` files are editable sources for you to export from, and can be deleted if you keep artwork elsewhere.

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

The executor produces **one container format per run, chosen by the machine you run it on**. Each container holds every standard resolution internally, so a single `.ico` or `.icns` covers all the sizes the OS asks for.

| Build platform | Format produced | `png2icons` flag                              |
| -------------- | --------------- | --------------------------------------------- |
| macOS          | `.icns`         | `-icns`                                       |
| Windows        | `.ico`          | `-icop` (members stored PNG-compressed)       |
| Linux          | `.ico`          | `-icop` — same as Windows, see the note below |

::: warning Icons are not cross-compiled
Running the target on Windows produces only `.ico`; it does not also emit the `.icns` that a macOS build needs. If you distribute for multiple platforms, generate icons on each platform (or in a per-platform CI job) as part of that platform's build.

Linux takes the `-icop` branch too, so it also receives an `.ico` rather than the loose `.png` set Linux packaging conventionally expects. This matches the `.ico` reference in the generated `electron-builder.yml`, but it is a known rough edge rather than an intentional design.
:::

## Icon Output Location

Generated icons land flat in the icons folder for your project — `dist/{project-directory}-icons`, the `iconOutputPath` wired into the `nx-electron-icons` target. There are no per-platform subdirectories:

```
dist/
└── apps/
    └── my-app-electron-icons/
        ├── icon.ico     # or icon.icns on macOS
        └── setup.ico    # or setup.icns on macOS
```

## Integration with Build Process

Icon generation is automatically integrated into your production build workflow:

1. **Automatic Dependency**: The `dist` target depends on `nx-electron-icons`
2. **Build Order**: Icons are generated before the final application packaging
3. **electron-builder Integration**: Generated icons are automatically used by electron-builder

## Customizing Icon Generation

### Custom Output Path

The **source** paths are fixed by convention: the executor always reads `{projectRoot}/src/resources/icon/source/icon.png` and `setup.png`. To use your own artwork, replace those two files in place rather than pointing the target elsewhere.

What you can configure is where the generated icons are written, plus the mode:

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
