# Generator: setup-project

The `setup-project` generator creates a new Electron "host" application that wraps an existing frontend application in your workspace with an Electron shell.

## Usage

```bash
nx g @erickrodrcodes/nx-electron-vite:setup-project
```

## What it does

- Creates a new Electron host project with main process, preload script, and configuration files
- Registers the host's Nx targets and wires their dependency order
- Declares the guest project as an `implicitDependencies` entry so Nx rebuilds in the right order
- Generates all required configuration files for Electron development and building

### Targets registered

| Target              | Executor                                          | Notes                                                                       |
| ------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| `build`             | `@nx/vite:build`                                  | Builds main + preload. Depends on the guest project's `build`.              |
| `serve`             | `@nx/vite:dev-server`                             | Host dev server only.                                                       |
| `electron`          | `nx:run-commands`                                 | Primary dev command; `serve` (default) runs guest + host in parallel.       |
| `preview`           | `@nx/vite:preview-server`                         | Serves the built host output.                                               |
| `nx-electron-icons` | `@erickrodrcodes/nx-electron-vite:build-icon`     | Configurations `app`, `setup`, `default` (composite). Depends on `build`.   |
| `dist`              | `@erickrodrcodes/nx-electron-vite:build-electron` | Packages installers. Depends on `nx-electron-icons`.                        |
| `test`              | `@nx/vitest:test`                                 | Points at the project's `vite.config.ts`.                                   |
| `lint`              | _inferred_                                        | Declares `dependsOn: ['^lint']`; the executor comes from the ESLint plugin. |

The chain means `nx dist my-app-electron` alone is enough for a release build: it pulls in icons, the host build, and the guest build in order.

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

::: warning Known issue: `test` is not wired up
The schema accepts `test`, but the templates branch on an internal `testRunner` value that this option never populates. Passing `--test=vitest` therefore does **not** add the Vitest block to the generated `vite.config.ts`, nor add `vitest` to your dependencies.

A `test` target pointing at `@nx/vitest:test` is registered regardless of what you pass. To actually run main-process tests today, add the `test` block to the generated `vite.config.ts` yourself:

```ts
export default defineConfig({
  // …
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});
```

:::

## Generated Files

The generator creates a complete Electron project structure. Everything below is written on every run:

**Process code**

- `src/main/main.ts` — Main process entry point
- `src/main/electron-env.d.ts` — Ambient types, including the `window.electronAPI` contract
- `src/main/native/readme.md` — Placeholder for native binaries added later by [`build-native`](/generators/build-native)
- `src/preload/preload.ts` — Preload script exposing named operations over `contextBridge`

**Build and packaging**

- `electron-nx-vite.config.ts` — Electron/Vite integration (dev startup, native copying, production renaming)
- `vite.config.ts` — Vite configuration for development and building
- `index.html` — Host entry HTML, including the Content Security Policy
- `src/electron-builder.yml` — electron-builder configuration for packaging
- `src/installer.nsh` — NSIS installer customization hook (Windows)
- `src/dev-app-update.yml` — Local auto-update testing stub
- `package.json` — Project-specific package configuration

**Resources**

- `src/resources/icon/source/icon.png`, `setup.png` — Icon sources read by `nx-electron-icons`
- `src/resources/icon/source/icon.svg`, `icon-o.svg`, `icon-o2.svg`, `icon.ai` — Editable placeholder artwork
- `src/resources/entitlements/macos/entitlements.mac.plist` — macOS hardened runtime entitlements
- `src/resources/sign-windows.js` — Windows code signing script

**Tooling config**

- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json` — TypeScript configuration
- `eslint.config.mjs` — Lint configuration
- `.env` — Debug ports (`DEBUG_PORT_MAIN`, `DEBUG_PORT_RENDERER`)
- `.babelrc`, `.swcrc` — Transform configuration
- `debugme.md` — Project-specific debugging setup guide

Two files vary in **content** rather than presence: `src/electron-builder.yml` gains a `publish:` block when `updater` is `true`, and `vite.config.ts` gains a Vitest `test` block when a test runner is selected.

::: warning `reference.json` is not created here
`src/main/native/reference.json`, the manifest of native binaries, is created by the [`build-native`](/generators/build-native) generator the first time you add a native module. A freshly scaffolded project has only the `readme.md` in that folder.
:::
