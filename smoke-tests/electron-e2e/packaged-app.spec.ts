import { expect, test, _electron as electron } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findPackagedNativeBinary,
  SQLITE_SMOKE_MOCK_ROWS,
} from '../shared/inject-sqlite-ipc';
import type { LatestWorkspacePointer } from '../shared/latest-workspace';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** Shape exposed by generated preload `contextBridge.exposeInMainWorld('ipcRenderer', …)` */
type PreloadIpc = {
  on: (
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => void,
  ) => void;
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
};

function readPointer(): LatestWorkspacePointer {
  const fromEnv = process.env.SMOKE_WORKSPACE;
  const pointerPath = join(__dirname, '../tmp/latest-workspace.json');

  if (fromEnv) {
    return {
      workspacePath: fromEnv,
      runDir: fromEnv,
      guestApp: process.env.SMOKE_GUEST_APP || 'smoke-test-app',
      electronHost:
        process.env.SMOKE_ELECTRON_HOST || 'smoke-test-app-electron',
      executableName: process.env.SMOKE_EXECUTABLE_NAME || 'smoke-test-app',
      hasDist: true,
      hasNative: process.env.SMOKE_NATIVE === '1',
      nativeBinaryName:
        process.env.SMOKE_NATIVE_BINARY || 'better-sqlite3.node',
      updatedAt: new Date().toISOString(),
    };
  }

  if (!existsSync(pointerPath)) {
    throw new Error(
      `Missing ${pointerPath}. Run Layer 1 first: pnpm nx test smoke-tests`,
    );
  }

  return JSON.parse(
    readFileSync(pointerPath, 'utf8').replace(/^\uFEFF/, ''),
  ) as LatestWorkspacePointer;
}

function resolvePackagedExecutable(pointer: LatestWorkspacePointer): string {
  const { workspacePath, executableName } = pointer;

  if (process.platform === 'win32') {
    return join(workspacePath, 'dist', 'win-unpacked', `${executableName}.exe`);
  }

  if (process.platform === 'darwin') {
    const appName = pointer.guestApp;
    return join(
      workspacePath,
      'dist',
      'mac',
      `${appName}.app`,
      'Contents',
      'MacOS',
      appName,
    );
  }

  return join(workspacePath, 'dist', executableName);
}

test.describe('Layer 2: Playwright Electron', () => {
  test('packaged app launches and IPC works both directions', async () => {
    const pointer = readPointer();
    expect(
      pointer.hasDist,
      'Layer 1 dist step did not complete (hasDist=false). Re-run: pnpm nx test smoke-tests',
    ).toBe(true);

    const executablePath = resolvePackagedExecutable(pointer);
    expect(
      existsSync(executablePath),
      `Packaged executable not found: ${executablePath}`,
    ).toBe(true);

    const userDataDir = mkdtempSync(join(tmpdir(), 'smoke-electron-'));

    const electronApp = await electron.launch({
      executablePath,
      args: [`--user-data-dir=${userDataDir}`],
      timeout: 60_000,
    });

    try {
      const isPackaged = await electronApp.evaluate(async ({ app }) => {
        return app.isPackaged;
      });
      expect(isPackaged).toBe(true);

      const window = await electronApp.firstWindow();
      await window.waitForLoadState('domcontentloaded');
      await expect(window.locator('body')).toBeVisible();

      const bridgeReady = await window.evaluate(() => {
        const api = (window as unknown as { ipcRenderer?: PreloadIpc })
          .ipcRenderer;
        return Boolean(api?.invoke && api?.on);
      });
      expect(
        bridgeReady,
        'window.ipcRenderer bridge from preload missing',
      ).toBe(true);

      const ping = await window.evaluate(async () => {
        const api = (window as unknown as { ipcRenderer: PreloadIpc })
          .ipcRenderer;
        return api.invoke('app:ping');
      });
      expect(ping).toEqual({
        ok: true,
        from: 'main',
        packaged: true,
      });

      const pushPromise = window.evaluate(() => {
        return new Promise<string>((resolve, reject) => {
          const api = (window as unknown as { ipcRenderer: PreloadIpc })
            .ipcRenderer;
          const timer = setTimeout(
            () =>
              reject(new Error('Timed out waiting for main-process-message')),
            15_000,
          );
          api.on('main-process-message', (_event, payload) => {
            clearTimeout(timer);
            resolve(String(payload));
          });
        });
      });

      await electronApp.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (!win) {
          throw new Error('No BrowserWindow available to send IPC');
        }
        win.webContents.send(
          'main-process-message',
          'layer2-ipc-main-to-renderer',
        );
      });

      await expect(pushPromise).resolves.toBe('layer2-ipc-main-to-renderer');
    } finally {
      await electronApp.close();
      try {
        rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors on Windows file locks
      }
    }
  });

  test('packaged .node loads in main and pushes sqlite mock rows', async ({}, testInfo) => {
    const pointer = readPointer();
    test.skip(
      !pointer.hasNative || !pointer.nativeBinaryName,
      'Requires Layer 1 with SMOKE_NATIVE=1 (hasNative pointer)',
    );

    const nativeBinaryName = pointer.nativeBinaryName!;
    const packagedNode = findPackagedNativeBinary(
      pointer.workspacePath,
      pointer.guestApp,
      pointer.electronHost,
      nativeBinaryName,
    );
    expect(
      packagedNode,
      `Packaged ${nativeBinaryName} missing under dist (asarUnpack?)`,
    ).toBeTruthy();

    const executablePath = resolvePackagedExecutable(pointer);
    expect(existsSync(executablePath)).toBe(true);

    const userDataDir = mkdtempSync(join(tmpdir(), 'smoke-electron-native-'));
    const electronApp = await electron.launch({
      executablePath,
      args: [`--user-data-dir=${userDataDir}`],
      timeout: 60_000,
    });

    try {
      const window = await electronApp.firstWindow();
      await window.waitForLoadState('domcontentloaded');

      const status = await window.evaluate(async () => {
        const api = (window as unknown as { ipcRenderer: PreloadIpc })
          .ipcRenderer;
        return api.invoke('db:native-status') as Promise<{
          loaded: boolean;
          bindingExists: boolean;
          nativeBinaryName: string;
          rows: Array<{ id: number; name: string }>;
        }>;
      });

      expect(status.loaded).toBe(true);
      expect(status.bindingExists).toBe(true);
      expect(status.nativeBinaryName).toBe(nativeBinaryName);
      expect(status.rows).toEqual([...SQLITE_SMOKE_MOCK_ROWS]);

      const rowsPromise = window.evaluate(() => {
        return new Promise<Array<{ id: number; name: string }>>(
          (resolve, reject) => {
            const api = (window as unknown as { ipcRenderer: PreloadIpc })
              .ipcRenderer;
            const timer = setTimeout(
              () => reject(new Error('Timed out waiting for db:mock-rows')),
              15_000,
            );
            api.on('db:mock-rows', (_event, payload) => {
              clearTimeout(timer);
              resolve(payload as Array<{ id: number; name: string }>);
            });
          },
        );
      });

      await window.evaluate(async () => {
        const api = (window as unknown as { ipcRenderer: PreloadIpc })
          .ipcRenderer;
        return api.invoke('db:publish-mock');
      });

      await expect(rowsPromise).resolves.toEqual([...SQLITE_SMOKE_MOCK_ROWS]);

      testInfo.annotations.push({
        type: 'native',
        description: `Loaded ${nativeBinaryName} from ${packagedNode}`,
      });
    } finally {
      await electronApp.close();
      try {
        rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });
});
