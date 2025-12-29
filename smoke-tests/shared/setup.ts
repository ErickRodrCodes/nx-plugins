import { execSync } from 'child_process';
import { mkdirSync } from 'fs';
import { join } from 'path';
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
  const tarGzPath = join(smokeTestsTmpDir, 'nx-electron-vite.tar.gz');
  execSync(
    `tar -czf "${tarGzPath}" --directory=dist/packages/nx-electron-vite --exclude=node_modules --exclude=.git .`,
    {
      cwd: rootDir,
      stdio: 'inherit',
    }
  );

  // Step 3: Create workspace
  console.log('Creating workspace...');
  const workspacePath = join(smokeTestsTmpDir, 'smoke-test-workspace');
  workspaceGenerator = new WorkspaceGenerator(workspacePath, true);
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
  workspaceGenerator.generateReactApp('smoke-test-app');

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
  const command = `npx nx g @erickrodrcodes/nx-electron-vite:setup-project --guestProject="smoke-test-app" --nameProject="${electronAppName}" --name="Smoke Test Electron App" --author="Test Author" --description="Test Electron application" --executableName="smoke-test-app" --updater=false --test=none --no-interactive`;
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
