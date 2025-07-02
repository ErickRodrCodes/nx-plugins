import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { rimraf } from 'rimraf';
import { fileURLToPath } from 'url';
import { afterAll, beforeAll } from 'vitest';
import { WorkspaceGenerator } from './workspace-generator';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '../../');
const smokeTestsTmpDir = join(__dirname, '../tmp');

let workspaceGenerator: WorkspaceGenerator | null = null;

// Global setup - runs once before all tests
beforeAll(async () => {
  // Step 1: Check if workspace already exists and is properly configured
  const workspacePath = join(smokeTestsTmpDir, 'smoke-test-workspace');
  const workspaceExists = existsSync(workspacePath);
  const tarGzExists = existsSync(join(smokeTestsTmpDir, 'nx-electron-vite.tar.gz'));

  // Only clean if neither workspace nor tar.gz exist
  if (!workspaceExists && !tarGzExists) {
    if (existsSync(smokeTestsTmpDir)) {
      await rimraf(smokeTestsTmpDir);
    }
    // Create tmp directory
    mkdirSync(smokeTestsTmpDir, { recursive: true });
  } else if (!existsSync(smokeTestsTmpDir)) {
    // Create tmp directory if it doesn't exist
    mkdirSync(smokeTestsTmpDir, { recursive: true });
  }

  // Step 2: Build plugin (only if tar.gz doesn't exist)
  if (!tarGzExists) {
    execSync('pnpm nx build nx-electron-vite', { cwd: rootDir, stdio: 'inherit' });

    // Step 3: Create tar.gz directly in smoke-tests/tmp
    const tarGzPath = join(smokeTestsTmpDir, 'nx-electron-vite.tar.gz');
    execSync(`tar -czf "${tarGzPath}" --directory=dist/packages/nx-electron-vite --exclude=node_modules --exclude=.git .`, {
      cwd: rootDir,
      stdio: 'inherit'
    });
  }

  // Step 4: Create workspace (only if it doesn't exist)
  if (!workspaceExists) {
    workspaceGenerator = new WorkspaceGenerator('smoke-test-workspace');
    await workspaceGenerator.createWorkspace({
      name: 'smoke-test-workspace',
      preset: 'react-monorepo',
      packageManager: 'pnpm',
      skipGit: true,
      nxCloud: false,
      directory: smokeTestsTmpDir
    });
  } else {
    // If workspace already exists, just create the generator instance
    workspaceGenerator = new WorkspaceGenerator('smoke-test-workspace');
  }

  // Step 5: Copy tar.gz and install plugin as devDependency (if not already done)
  workspaceGenerator.copyPluginTarGz();
  workspaceGenerator.addPluginAsDevDependency();

  // Step 6: Run the init generator (only once globally)
  workspaceGenerator.execCommand('pnpm nx g @erickrodrcodes/nx-electron-vite:init');
}, 120000); // 2 minutes timeout

// Global cleanup - runs once after all tests
afterAll(async () => {
  // Temporarily disabled cleanup for debugging
  // if (workspaceGenerator) {
  //   await workspaceGenerator.cleanup();
  // }
}, 30000);

export { rootDir, smokeTestsTmpDir, workspaceGenerator };

