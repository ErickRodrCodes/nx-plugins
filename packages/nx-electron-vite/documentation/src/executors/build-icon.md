# Executor: build-icon

The `build-icon` executor generates platform-specific application icons from PNG source files using the `png2icons` tool. It converts your source icons into the formats required by different operating systems.

## Usage

```bash
nx run my-app-electron:nx-electron-icons
```

## What it does

- Converts PNG source files to platform-specific icon formats
- Generates icons for application and installer use
- Creates ICO (Windows), ICNS (macOS), and PNG (Linux) formats
- Outputs icons to the specified directory for use by electron-builder

## Options

| Option            | Type                                  | Required | Description                                        |
| ----------------- | ------------------------------------- | -------- | -------------------------------------------------- |
| `hostProject`     | `string`                              | ✅       | Name of the Electron host project                  |
| `hostProjectRoot` | `string`                              | ✅       | Relative path to the host project root directory   |
| `iconOutputPath`  | `string`                              | ✅       | Directory path where generated icons will be saved |
| `mode`            | `"app"` \| `"setup"` \| `"composite"` | ✅       | Icon generation mode                               |

## Modes

- **`app`**: Generates only application icons from `src/resources/icon/source/icon.png`
- **`setup`**: Generates only installer icons from `src/resources/icon/source/setup.png`
- **`composite`**: Generates both application and installer icons

## Source Files Required

Place your source PNG files in the host project:

- `src/resources/icon/source/icon.png` - Source for application icon (512x512 recommended)
- `src/resources/icon/source/setup.png` - Source for installer icon (512x512 recommended)

## Generated Output

The executor creates platform-specific icons:

- **Windows**: `icon.ico`, `setup.ico`
- **macOS**: `icon.icns`
- **Linux**: `icon.png`
