import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll } from 'vitest';
import { WorkspaceGenerator } from './workspace-generator';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '../../');
const testHash = Date.now().toString();
const smokeTestsTmpDir = join(__dirname, `../tmp/run-${testHash}`);

/** Shared constants for Layer 1 packaging smoke */
export const GUEST_APP = 'smoke-test-app';
export const ELECTRON_HOST = 'smoke-test-app-electron';
export const EXECUTABLE_NAME = 'smoke-test-app';

let workspaceGenerator: WorkspaceGenerator | null = null;

beforeAll(async () => {
  console.log('Killing any lingering esbuild processes...');
  try {
    if (process.platform === 'win32') {
      const taskkillPath = join(
        process.env.SYSTEMROOT || 'C:\\Windows',
        'System32',
        'taskkill.exe',
      );
      spawnSync(taskkillPath, ['/im', 'esbuild.exe', '/f'], {
        cwd: rootDir,
        stdio: 'ignore',
        shell: false,
      });
    }
    console.log('✓ Cleaned up esbuild processes');
  } catch {
    console.log('✓ No esbuild processes to clean up');
  }

  mkdirSync(smokeTestsTmpDir, { recursive: true });

  console.log('Building plugin...');
  execSync('pnpm nx clean nx-electron-vite', {
    cwd: rootDir,
    stdio: 'inherit',
  });
  execSync('pnpm nx build nx-electron-vite', {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const tarGzPath = join(smokeTestsTmpDir, 'nx-electron-vite.tar.gz');
  if (process.platform === 'win32') {
    const tarPath = join(
      process.env.SYSTEMROOT || 'C:\\Windows',
      'system32',
      'tar.exe',
    );
    spawnSync(
      tarPath,
      [
        '-czf',
        tarGzPath,
        '--directory=dist/packages/nx-electron-vite',
        '--exclude=node_modules',
        '--exclude=.git',
        '.',
      ],
      { cwd: rootDir, stdio: 'inherit', shell: false },
    );
  } else {
    execSync(
      `tar -czf "${tarGzPath}" --exclude=node_modules --exclude=.git -C dist/packages/nx-electron-vite .`,
      { cwd: rootDir, stdio: 'inherit' },
    );
  }

  console.log('Creating workspace...');
  const workspacePath = join(smokeTestsTmpDir, 'smoke-test-workspace');
  workspaceGenerator = WorkspaceGenerator.fromAbsolutePath(workspacePath);
  await workspaceGenerator.createWorkspace({
    name: 'smoke-test-workspace',
    preset: 'apps',
    packageManager: 'npm',
    skipGit: true,
    nxCloud: false,
    directory: smokeTestsTmpDir,
  });

  const nx = () => workspaceGenerator!.nxCli();

  console.log('Adding @nx/react...');
  workspaceGenerator.execCommand(`${nx()} add @nx/react --yes`);

  console.log('Creating React guest app...');
  workspaceGenerator.generateReactApp(GUEST_APP, `apps/${GUEST_APP}`);

  console.log('Installing plugin from local tarball...');
  workspaceGenerator.copyPluginTarGz();
  workspaceGenerator.addPluginAsDevDependency();

  console.log('Running init generator...');
  workspaceGenerator.execCommand(
    `${nx()} g @erickrodrcodes/nx-electron-vite:init`,
  );

  console.log('Creating Electron host project...');
  workspaceGenerator.execCommand(
    `${nx()} g @erickrodrcodes/nx-electron-vite:setup-project --guestProject="${GUEST_APP}" --name="Smoke Test Electron App" --author="Test Author" --description="Test Electron application" --executableName="${EXECUTABLE_NAME}" --directory="apps/${ELECTRON_HOST}" --updater=false --test=none --no-interactive`,
  );

  console.log('Layer 1 setup completed successfully');
}, 300000);

afterAll(async () => {
  // Keep workspace on disk for debugging failed CI/local runs.
  // Set SMOKE_CLEANUP=1 to remove the temp workspace after tests.
  if (process.env.SMOKE_CLEANUP === '1' && workspaceGenerator) {
    await workspaceGenerator.cleanup();
  }
}, 30000);

export { rootDir, smokeTestsTmpDir, workspaceGenerator };
