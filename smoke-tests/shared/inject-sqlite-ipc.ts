import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Fixed seed used by host main + Layer 2 assertions */
export const SQLITE_SMOKE_MOCK_ROWS = [
  { id: 1, name: 'alice' },
  { id: 2, name: 'bob' },
] as const;

const SQLITE_SMOKE_MODULE = `/**
 * Smoke-only: proves better-sqlite3 .node is loadable from host main.
 * Injected by smoke-tests; not part of the product template.
 */
import { BrowserWindow, ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

declare const __dirname: string

export const SQLITE_SMOKE_MOCK_ROWS = ${JSON.stringify(
  [...SQLITE_SMOKE_MOCK_ROWS],
  null,
  2,
)} as const

type MockRow = { id: number; name: string }

function resolveNativeBindingPath(): string {
  // copyNative places .node next to main.cjs in outputDistFolder
  const flat = join(__dirname, 'better-sqlite3.node')
  if (existsSync(flat)) return flat

  const nested = join(__dirname, 'native', 'better-sqlite3.node')
  if (existsSync(nested)) return nested

  const refPath = join(__dirname, 'native', 'reference.json')
  if (existsSync(refPath)) {
    const ref = JSON.parse(readFileSync(refPath, 'utf8')) as {
      'better-sqlite3'?: { path?: string }
    }
    const name = ref['better-sqlite3']?.path
    if (name) {
      const fromRef = join(__dirname, 'native', name)
      if (existsSync(fromRef)) return fromRef
      const flatFromRef = join(__dirname, name)
      if (existsSync(flatFromRef)) return flatFromRef
    }
  }

  throw new Error(
    'better-sqlite3.node not found next to main or under native/ (copyNative / build-native missing?)',
  )
}

let cached: {
  loaded: true
  bindingExists: true
  nativeBindingPath: string
  nativeBinaryName: string
  rows: MockRow[]
} | null = null

function loadAndSeed() {
  if (cached) return cached

  const nativeBindingPath = resolveNativeBindingPath()
  const db = new Database(':memory:', { nativeBinding: nativeBindingPath })
  db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)')
  const insert = db.prepare('INSERT INTO items (id, name) VALUES (?, ?)')
  for (const row of SQLITE_SMOKE_MOCK_ROWS) {
    insert.run(row.id, row.name)
  }
  const rows = db.prepare('SELECT id, name FROM items ORDER BY id').all() as MockRow[]

  cached = {
    loaded: true,
    bindingExists: true,
    nativeBindingPath,
    nativeBinaryName: basename(nativeBindingPath),
    rows,
  }
  return cached
}

export function registerSqliteSmokeIpc(): void {
  ipcMain.handle('db:native-status', async () => loadAndSeed())

  ipcMain.handle('db:publish-mock', async () => {
    const status = loadAndSeed()
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('db:mock-rows', status.rows)
    }
    return { ok: true as const, count: status.rows.length }
  })
}

export function pushSqliteMockRows(win: BrowserWindow): void {
  const status = loadAndSeed()
  win.webContents.send('db:mock-rows', status.rows)
}
`;

/**
 * Named preload wrappers for the sqlite smoke channels.
 *
 * The generated preload exposes only fixed, named operations, so reaching a new
 * channel from the renderer means adding a wrapper here — the same step a real
 * consumer takes. Mirrors the template style: strip the event, return a
 * disposer.
 */
const SQLITE_SMOKE_PRELOAD_API = `
  // --- injected by smoke-tests: wrappers for the sqlite smoke channels ---
  dbNativeStatus: () => ipcRenderer.invoke('db:native-status'),

  dbPublishMock: () => ipcRenderer.invoke('db:publish-mock'),

  onDbMockRows: (callback: (rows: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, rows: unknown) => callback(rows)

    ipcRenderer.on('db:mock-rows', listener)

    return () => {
      ipcRenderer.off('db:mock-rows', listener)
    }
  },
`;

/** Adds the sqlite smoke operations to the generated host preload. */
function injectSqlitePreloadApi(
  workspacePath: string,
  electronHost: string,
): void {
  const preloadPath = join(
    workspacePath,
    'apps',
    electronHost,
    'src',
    'preload',
    'preload.ts',
  );

  if (!existsSync(preloadPath)) {
    throw new Error(`Host preload.ts not found: ${preloadPath}`);
  }

  let preload = readFileSync(preloadPath, 'utf8');

  if (preload.includes('dbNativeStatus')) return;

  const anchor = preload.match(
    /contextBridge\.exposeInMainWorld\(\s*['"]electronAPI['"]\s*,\s*\{/,
  );
  if (!anchor || anchor.index === undefined) {
    throw new Error(
      `Could not find exposeInMainWorld('electronAPI', {) in ${preloadPath}`,
    );
  }

  const insertAt = anchor.index + anchor[0].length;
  preload =
    preload.slice(0, insertAt) +
    `\n${SQLITE_SMOKE_PRELOAD_API}` +
    preload.slice(insertAt);

  writeFileSync(preloadPath, preload, 'utf8');
  console.log(`💉 Injected sqlite preload API into ${preloadPath}`);
}

/**
 * Writes sqlite smoke module and wires it into generated host main.ts, then
 * exposes the matching named operations through the host preload.
 * Call only after build-native has placed the .node.
 */
export function injectSqliteSmokeIpc(options: {
  workspacePath: string;
  electronHost: string;
}): void {
  const { workspacePath, electronHost } = options;
  const mainDir = join(workspacePath, 'apps', electronHost, 'src', 'main');
  const mainPath = join(mainDir, 'main.ts');
  const smokePath = join(mainDir, 'sqlite-smoke.ts');

  if (!existsSync(mainPath)) {
    throw new Error(`Host main.ts not found: ${mainPath}`);
  }

  mkdirSync(mainDir, { recursive: true });
  writeFileSync(smokePath, SQLITE_SMOKE_MODULE, 'utf8');

  let main = readFileSync(mainPath, 'utf8');

  // Idempotent cleanup of prior smoke wiring
  main = main.replace(
    /\r?\nimport \{ registerSqliteSmokeIpc, pushSqliteMockRows \} from ['"]\.\/sqlite-smoke['"];?\r?\n/g,
    '\n',
  );
  main = main.replace(/\r?\nregisterSqliteSmokeIpc\(\);?\r?\n/g, '\n');
  main = main.replace(/\r?\n\s*pushSqliteMockRows\(mainWindow\);?\r?\n/g, '\n');

  const importLine =
    "import { registerSqliteSmokeIpc, pushSqliteMockRows } from './sqlite-smoke';\n";

  if (!main.includes("from './sqlite-smoke'")) {
    const pathImport = main.match(/from ['"]node:path['"];?\r?\n/);
    if (!pathImport || pathImport.index === undefined) {
      throw new Error('Could not find node:path import in main.ts');
    }
    const insertAt = pathImport.index + pathImport[0].length;
    main = main.slice(0, insertAt) + importLine + main.slice(insertAt);
  }

  if (!main.includes('registerSqliteSmokeIpc()')) {
    // Match full handle: ipcMain.handle('app:ping', async () => ({ ... }))
    const pingRe =
      /ipcMain\.handle\(\s*['"]app:ping['"]\s*,\s*async\s*\(\)\s*=>\s*\(\{[\s\S]*?\}\)\s*\)\s*;?/;
    if (!pingRe.test(main)) {
      throw new Error(
        'Could not find ipcMain.handle(app:ping) block in main.ts',
      );
    }
    main = main.replace(pingRe, (block) => {
      const trimmed = block.replace(/;?\s*$/, '');
      return `${trimmed};\n\nregisterSqliteSmokeIpc();\n`;
    });
  }

  if (!main.includes('pushSqliteMockRows(mainWindow)')) {
    const sendRe =
      /mainWindow\?\.webContents\.send\(\s*['"]main-process-message['"]\s*,\s*new Date\(\)\.toLocaleString\(\)\s*,?\s*\)\s*;?/;
    if (!sendRe.test(main)) {
      throw new Error('Could not find main-process-message send in main.ts');
    }
    main = main.replace(sendRe, (send) => {
      const trimmed = send.replace(/;?\s*$/, '');
      return `${trimmed};\n    pushSqliteMockRows(mainWindow);`;
    });
  }

  writeFileSync(mainPath, main, 'utf8');
  console.log(`💉 Injected sqlite smoke IPC into ${mainPath}`);

  injectSqlitePreloadApi(workspacePath, electronHost);
}

export function resolveHostNativeBinaryName(
  workspacePath: string,
  electronHost: string,
): string {
  const referencePath = join(
    workspacePath,
    'apps',
    electronHost,
    'src',
    'main',
    'native',
    'reference.json',
  );
  const reference = JSON.parse(
    readFileSync(referencePath, 'utf8').replace(/^\uFEFF/, ''),
  ) as Record<string, { path?: string }>;
  const name = reference['better-sqlite3']?.path;
  if (!name) {
    throw new Error(`better-sqlite3 missing from ${referencePath}`);
  }
  return name;
}

/** Host Vite output folder where copyNative places the .node */
export function resolveHostDistNativePath(
  workspacePath: string,
  electronHost: string,
  nativeBinaryName: string,
): string {
  return join(workspacePath, 'dist', 'apps', electronHost, nativeBinaryName);
}

/**
 * Packaged layout: electron-builder keeps host outputDistFolder structure under
 * resources/app.asar.unpacked (asarUnpack for .node files).
 */
export function resolvePackagedNativeCandidates(
  workspacePath: string,
  guestApp: string,
  electronHost: string,
  nativeBinaryName: string,
): string[] {
  const base = join(workspacePath, 'dist');
  const nestedUnpacked = join(
    'app.asar.unpacked',
    'dist',
    'apps',
    electronHost,
    nativeBinaryName,
  );
  if (process.platform === 'win32') {
    return [
      join(base, 'win-unpacked', 'resources', nestedUnpacked),
      join(
        base,
        'win-unpacked',
        'resources',
        'app.asar.unpacked',
        nativeBinaryName,
      ),
    ];
  }
  if (process.platform === 'darwin') {
    const res = join(base, 'mac', `${guestApp}.app`, 'Contents', 'Resources');
    return [
      join(res, nestedUnpacked),
      join(res, 'app.asar.unpacked', nativeBinaryName),
    ];
  }
  return [
    join(base, 'linux-unpacked', 'resources', nestedUnpacked),
    join(
      base,
      'linux-unpacked',
      'resources',
      'app.asar.unpacked',
      nativeBinaryName,
    ),
  ];
}

export function findPackagedNativeBinary(
  workspacePath: string,
  guestApp: string,
  electronHost: string,
  nativeBinaryName: string,
): string | null {
  for (const candidate of resolvePackagedNativeCandidates(
    workspacePath,
    guestApp,
    electronHost,
    nativeBinaryName,
  )) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
