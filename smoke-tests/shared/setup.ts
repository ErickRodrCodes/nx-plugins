import { execSync, spawnSync } from 'child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'url';
import { afterAll, beforeAll } from 'vitest';
import { WorkspaceGenerator } from './workspace-generator';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '../../');
const testHash = Date.now().toString();
const smokeTestsTmpDir = join(__dirname, `../tmp/run-${testHash}`);

let workspaceGenerator: WorkspaceGenerator | null = null;

// Global setup - runs once before all tests
beforeAll(async () => {
  // Step 0: Kill any lingering esbuild processes that might lock files
  console.log('Killing any lingering esbuild processes...');
  try {
    // Use full path to taskkill.exe for security (prevents PATH manipulation attacks)
    // Use spawnSync with shell: false to avoid shell injection
    const taskkillPath = join(
      process.env.SYSTEMROOT || 'C:\\Windows',
      'System32',
      'taskkill.exe'
    );
    spawnSync(taskkillPath, ['/im', 'esbuild.exe', '/f'], {
      cwd: rootDir,
      stdio: 'ignore', // Suppress output - it's ok if no process exists
      shell: false,
    });
    console.log('✓ Cleaned up esbuild processes');
  } catch (e) {
    // Ignore errors - process might not be running
    console.log('✓ No esbuild processes to clean up');
  }

  // Create unique directory - no cleanup needed since it's unique
  mkdirSync(smokeTestsTmpDir, { recursive: true });

  // Step 1: Build plugin
  console.log('Building plugin...');
  execSync('pnpm nx clean nx-electron-vite', {
    cwd: rootDir,
    stdio: 'inherit',
  });

  execSync('pnpm nx build nx-electron-vite', {
    cwd: rootDir,
    stdio: 'inherit',
  });

  // Step 2: Create tar.gz
  // Use full path to tar.exe for security (prevents PATH manipulation attacks)
  const tarGzPath = join(smokeTestsTmpDir, 'nx-electron-vite.tar.gz');
  const tarPath = join(
    process.env.SYSTEMROOT || 'C:\\Windows',
    'system32',
    'tar.exe'
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
    {
      cwd: rootDir,
      stdio: 'inherit',
      shell: false,
    }
  );

  // Step 3: Create workspace
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

  // Step 3.1: Add @nx/react
  console.log('Adding @nx/react...');
  workspaceGenerator.execCommand('npx nx add @nx/react --yes');

  // Step 3.2: Create React app
  console.log('Creating React app...');
  workspaceGenerator.generateReactApp('smoke-test-app', 'apps/smoke-test-app');

  // Step 4: Install plugin
  console.log('Installing plugin...');
  workspaceGenerator.copyPluginTarGz();
  workspaceGenerator.addPluginAsDevDependency();

  // Step 5: Run init generator
  console.log('Running init generator...');
  workspaceGenerator.execCommand(
    'npx nx g @erickrodrcodes/nx-electron-vite:init'
  );

  // Step 6: Create Electron project
  console.log('Creating Electron project...');
  const electronAppName = 'smoke-test-app-electron';
  const command = `npx nx g @erickrodrcodes/nx-electron-vite:setup-project --guestProject="smoke-test-app" --name="Smoke Test Electron App" --author="Test Author" --description="Test Electron application" --executableName="smoke-test-app" --directory="apps/${electronAppName}" --updater=false --test=none --no-interactive`;
  workspaceGenerator.execCommand(command);

  console.log('Setup completed successfully');
}, 300000); // 5 minutes timeout

// Global cleanup - runs once after all tests
afterAll(async () => {
  // Temporarily disabled cleanup for debugging
  // if (workspaceGenerator) {
  //   await workspaceGenerator.cleanup();
  // }
}, 30000);

export { rootDir, smokeTestsTmpDir, workspaceGenerator };
