import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { rimraf } from 'rimraf';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const smokeTestsTmpRoot = join(__dirname, '../tmp');

/**
 * Non-negotiable: every Layer 1 run starts from a clean `smoke-tests/tmp`.
 * Stale win-unpacked / Electron locks are a common Windows EPERM source.
 */
export async function wipeSmokeTestsTmp(): Promise<void> {
  if (process.platform === 'win32') {
    const taskkill = join(
      process.env.SYSTEMROOT || 'C:\\Windows',
      'System32',
      'taskkill.exe',
    );
    for (const image of ['electron.exe', 'smoke-test-app.exe', 'esbuild.exe']) {
      spawnSync(taskkill, ['/im', image, '/f'], {
        stdio: 'ignore',
        shell: false,
      });
    }
  }

  if (!existsSync(smokeTestsTmpRoot)) {
    console.log(`✓ smoke-tests/tmp already absent (${smokeTestsTmpRoot})`);
    return;
  }

  console.log(`🧹 Removing smoke-tests/tmp: ${smokeTestsTmpRoot}`);
  await rimraf(smokeTestsTmpRoot, { maxRetries: 5, retryDelay: 200 });
  if (existsSync(smokeTestsTmpRoot)) {
    throw new Error(
      `Failed to remove smoke-tests/tmp (file lock?): ${smokeTestsTmpRoot}`,
    );
  }
  console.log('✓ smoke-tests/tmp removed');
}
