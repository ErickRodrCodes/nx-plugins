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
  // Step 1: Clean tmp directory (but not the workspace directory)
  if (existsSync(smokeTestsTmpDir)) {
    await rimraf(smokeTestsTmpDir);
  }

  // Step 2: Create tmp directory
  mkdirSync(smokeTestsTmpDir, { recursive: true });

  // Step 3: Build plugin
  execSync('pnpm nx build nx-electron-vite', { cwd: rootDir, stdio: 'inherit' });

  // Step 4: Create tar.gz directly in smoke-tests/tmp
  const tarGzPath = join(smokeTestsTmpDir, 'nx-electron-vite.tar.gz');
  execSync(`tar -czf "${tarGzPath}" --directory=dist/packages/nx-electron-vite --exclude=node_modules --exclude=.git .`, {
    cwd: rootDir,
    stdio: 'inherit'
  });

  // Step 5: Create workspace (only if it doesn't exist)
  const workspacePath = join(smokeTestsTmpDir, 'smoke-test-workspace');
  if (!existsSync(workspacePath)) {
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
}, 120000); // 2 minutes timeout

// Global cleanup - runs once after all tests
afterAll(async () => {
  // Temporarily disabled cleanup for debugging
  // if (workspaceGenerator) {
  //   await workspaceGenerator.cleanup();
  // }
}, 30000);

export { rootDir, smokeTestsTmpDir, workspaceGenerator };

