# Generator: init

The `init` generator sets up the `nx-electron-vite` plugin in your Nx workspace by configuring dependencies and workspace settings.

## Usage

The `init` generator typically runs automatically when you install the plugin:

```bash
nx add @erickrodrcodes/nx-electron-vite
```

You can also run it manually:

```bash
nx g @erickrodrcodes/nx-electron-vite:init
```

## What it does

- Configures the `@nx/vite/plugin` in your `nx.json`
- Adds all required Electron and Vite dependencies to your workspace `package.json`
- Runs the `@nx/vite` init generator for Vite support

## Options

| Option            | Type      | Default | Description                              |
| ----------------- | --------- | ------- | ---------------------------------------- |
| `skipPackageJson` | `boolean` | `false` | Skip adding dependencies to package.json |
| `skipFormat`      | `boolean` | `false` | Skip formatting files                    |

## Dependencies Added

The generator adds these key dependencies to your workspace:

- `electron` - The Electron framework
- `electron-builder` - For building distributable apps
- `vite-plugin-electron` - Vite integration for Electron
- `@electron/rebuild` - For native module support
- `png2icons` - Cross-platform icon generation
