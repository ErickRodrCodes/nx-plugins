# Smoke Tests — nx-electron-vite

Two layers:

| Layer | Tool                   | Purpose                                                            |
| ----- | ---------------------- | ------------------------------------------------------------------ |
| **1** | Vitest                 | Plugin contract: init → setup-project → icons → `dist` + installer |
| **2** | Playwright `_electron` | Runtime: launch packaged app, assert `isPackaged` + window         |

## Layout

```
smoke-tests/
├── shared/
│   ├── setup.ts
│   ├── workspace-generator.ts
│   └── latest-workspace.ts      # Pointer for Layer 2
├── nx-electron-vite/
│   └── smoke-tests-sequential.test.ts   # Layer 1
├── electron-e2e/
│   ├── playwright.config.ts
│   └── packaged-app.spec.ts             # Layer 2
├── vitest.config.ts
└── README.md
```

## Layer 1 (packaging)

```bash
pnpm nx test smoke-tests --output-style=stream-without-prefixes
```

Writes `tmp/latest-workspace.json` (with `hasDist: true` after a successful `dist`).

Opt-in native rebuild:

```bash
$env:SMOKE_NATIVE='1'; pnpm nx test smoke-tests --output-style=stream-without-prefixes
```

## Layer 2 (Playwright Electron)

Requires a prior Layer 1 run that produced `dist/win-unpacked` (or mac/linux equivalent).

```bash
pnpm nx run smoke-tests:e2e-electron
```

Override workspace path:

```bash
$env:SMOKE_WORKSPACE='C:\path\to\smoke-test-workspace'; pnpm nx run smoke-tests:e2e-electron
```

## Notes

- Guest React app uses `--style=css` (Nx 23).
- Temp workspace uses **npm**; Nx is invoked via `npx nx`.
- Layer 2 uses experimental Playwright Electron support (`_electron.launch`).
- Old `e2e/nx-electron-vite` browser+webServer suite is unrelated to Electron packaging; use Layer 2 instead.
