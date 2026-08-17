import { expect, test, _electron as electron } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LatestWorkspacePointer } from '../shared/latest-workspace';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

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
    // productName in generated builder yml is guestProject
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

  // Linux unpacked binary
  return join(workspacePath, 'dist', executableName);
}

test.describe('Layer 2: Playwright Electron', () => {
  test('packaged app launches, isPackaged, and shows a window', async () => {
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
      env: {
        ...process.env,
        // Avoid interactive prompts / noisy auto-open
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
      },
    });

    try {
      const isPackaged = await electronApp.evaluate(async ({ app }) => {
        return app.isPackaged;
      });
      expect(isPackaged).toBe(true);

      const window = await electronApp.firstWindow();
      await window.waitForLoadState('domcontentloaded');
      await expect(window.locator('body')).toBeVisible();

      // Guest Vite/React apps typically mount into #root
      const root = window.locator('#root');
      if (await root.count()) {
        await expect(root).toBeVisible();
      }
    } finally {
      await electronApp.close();
      try {
        rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors on Windows file locks
      }
    }
  });
});
