# Smoke Tests — nx-electron-vite

Two layers:

| Layer | Tool                   | Purpose                                                                   |
| ----- | ---------------------- | ------------------------------------------------------------------------- |
| **1** | Vitest                 | Plugin contract: init → setup-project → icons → `dist` + installer        |
| **2** | Playwright `_electron` | Runtime: packaged launch, `isPackaged`, IPC both ways (`app:ping` + push) |

With `SMOKE_NATIVE=1`, Layer 1 also rebuilds `better-sqlite3`, ships the `.node`, and Layer 2 asserts main loads it and pushes mock rows over IPC.

## Layout

```
smoke-tests/
├── shared/
│   ├── setup.ts
│   ├── wipe-tmp.ts
│   ├── workspace-generator.ts
│   ├── inject-sqlite-ipc.ts     # SMOKE_NATIVE host main inject
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

**Always deletes `smoke-tests/tmp` before setup** (no reuse of prior runs), then writes `tmp/latest-workspace.json` (with `hasDist: true` after a successful `dist`).

### Opt-in native (`.node` ship + load proof)

```bash
$env:SMOKE_NATIVE='1'; pnpm nx test smoke-tests --output-style=stream-without-prefixes
```

Ordered steps (before `dist`):

1. **Nx plugin** — `nx g …:build-native` (after `npm install -D better-sqlite3`) → `src/main/native/better-sqlite3.node` + `reference.json`.
2. **Edit host main** — inject `sqlite-smoke.ts` so main loads the `.node` via `nativeBinding`, seeds mock rows, and exposes `db:native-status` / `db:mock-rows` over preload IPC.
3. **Nx** — `nx run <host>:dist` (Vite `copyNative` + `build-electron` with `asarUnpack: **/*.node`).
4. Assert `.node` in host dist **and** under packaged `app.asar.unpacked`; set pointer `hasNative` for Layer 2.

Inference: if a real `.node` ships and loads in main, buildable host libraries that need native/main-only artifacts can use the same pipeline.

## Layer 2 (Playwright Electron)

Requires a prior Layer 1 run that produced `dist/win-unpacked` (or mac/linux equivalent).

```bash
pnpm nx run smoke-tests:e2e-electron
```

- Always: launch, `isPackaged`, preload bridge, `app:ping`, main→renderer string push.
- When pointer `hasNative`: packaged `.node` on disk, `db:native-status` (load proof), `db:mock-rows` push.

Override workspace path:

```bash
$env:SMOKE_WORKSPACE='C:\path\to\smoke-test-workspace'; pnpm nx run smoke-tests:e2e-electron
```

## Notes

- Guest React app uses `--style=css` (Nx 23).
- Temp workspace uses **npm**; Nx is invoked via `npx nx`.
- Layer 2 uses experimental Playwright Electron support (`_electron.launch`).
- Layer 2 is the only end-to-end suite. The former `e2e/nx-electron-vite` browser+webServer
  suite was removed: it drove a React page in three browsers and covered nothing about
  Electron packaging.
