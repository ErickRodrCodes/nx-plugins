# Smoke Tests (Layer 1) — nx-electron-vite

Vitest packaging smoke for the plugin. Proves generators and executors produce a
real installer. Does **not** launch Electron (that is Layer 2 / Playwright).

## Layout

```
smoke-tests/
├── shared/
│   ├── setup.ts                 # One-time: build plugin, temp Nx workspace, init + setup-project
│   └── workspace-generator.ts   # Helpers for the temp workspace
├── nx-electron-vite/
│   └── smoke-tests-sequential.test.ts
├── vitest.config.ts
└── README.md
```

## What Layer 1 asserts

1. **Setup** — plugin tarball, guest + host projects, `dist` target wired to
   `build-electron` with `nx-electron-icons` dependency, `executableName` in builder config
2. **Icons** — `nx run <host>:nx-electron-icons` writes platform icons under `dist/`
3. **Dist** — `nx run <host>:dist` creates an installer named
   `{executableName}-0.0.0-setup.{exe|dmg|…}`

## Opt-in: native modules

```bash
# Windows PowerShell
$env:SMOKE_NATIVE='1'; pnpm nx test smoke-tests --output-style=stream-without-prefixes
```

Without `SMOKE_NATIVE=1`, better-sqlite3 / `build-native` is skipped (flaky / slow on CI).

## Run

From repo root (preferred):

```bash
pnpm nx test smoke-tests --output-style=stream-without-prefixes
```

Cleanup temp workspace after the run:

```bash
$env:SMOKE_CLEANUP='1'; pnpm nx test smoke-tests --output-style=stream-without-prefixes
```

## Notes

- Temp workspace uses **npm** (create-nx-workspace); all `nx` calls go through that PM.
- Guest React app uses `--style=css` (Nx 23 no longer accepts `tailwind` on the style schema).
- Setup failures fail the suite before assertions; keep `beforeAll` lean and assertions high-signal.
- Layer 2 (Playwright `_electron.launch` against packaged / unpackaged app) is separate.
