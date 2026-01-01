import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { rimraf } from 'rimraf';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '../../');
const smokeTestsDir = join(__dirname, '../');

// Helper function to safely remove directory using rimraf
async function safeRemoveDir(dir: string): Promise<void> {
  if (!existsSync(dir)) return;
  await rimraf(dir, { maxRetries: 3 });
}

// Helper function to get Nx version from workspace root package.json
function getNxVersionFromWorkspace(): string {
  const packageJsonPath = join(rootDir, 'package.json');
  try {
    const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);

    // Try to get from devDependencies first, then dependencies
    const nxVersion =
      packageJson.devDependencies?.nx || packageJson.dependencies?.nx;

    if (!nxVersion) {
      throw new Error('Nx version not found in workspace package.json');
    }

    console.log(`📦 Using Nx version from workspace: ${nxVersion}`);
    return nxVersion;
  } catch (error) {
    console.warn(
      `⚠️  Could not read Nx version from workspace, using latest: ${error}`
    );
    return 'latest';
  }
}

export interface WorkspaceOptions {
  name?: string;
  preset?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm';
  skipGit?: boolean;
  nxCloud?: boolean;
  directory?: string;
}

export class WorkspaceGenerator {
  private tmpDir: string;
  private packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm';

  constructor(
    tmpDirNameOrPath: string = 'tmp-smoke-test',
    isAbsolute: boolean = false
  ) {
    if (isAbsolute) {
      this.tmpDir = tmpDirNameOrPath;
    } else {
      this.tmpDir = join(smokeTestsDir, 'tmp', tmpDirNameOrPath);
    }
  }

  /**
   * Creates a temporary Nx workspace
   */
  async createWorkspace(options: WorkspaceOptions = {}): Promise<string> {
    const {
      name = 'tmp-smoke-test',
      preset = 'react-monorepo',
      packageManager = 'npm',
      skipGit = true,
      nxCloud = false,
      directory = options.directory || process.cwd(),
    } = options;

    // Store package manager for later use
    this.packageManager = packageManager;

    // Only clean up if the directory already exists and we're creating a new workspace
    if (existsSync(this.tmpDir)) {
      await safeRemoveDir(this.tmpDir);
    }
    // Do NOT create the directory here; let create-nx-workspace do it

    // Use --nxCloud=skip to disable Nx Cloud in latest Nx CLI
    const nxCloudFlag = nxCloud ? '' : '--nxCloud=skip';
    const skipGitFlag = skipGit ? '--skip-git' : '';
    const workspaceTypeFlag =
      preset === 'empty' ? '--workspaceType=integrated' : '';

    const nxVersion = getNxVersionFromWorkspace();
    const createCommand = `npx --yes create-nx-workspace@${nxVersion} --name=${name} --preset=${preset} ${workspaceTypeFlag} ${nxCloudFlag} --package-manager=${packageManager} ${skipGitFlag} --interactive=false --verbose`;

    try {
      execSync(createCommand, {
        cwd: directory,
        stdio: 'inherit',
        encoding: 'utf8',
      });
    } catch (error) {
      const execError = error as any;
      if (execError.stdout)
        console.error(`📄 stdout: ${execError.stdout.toString()}`);
      if (execError.stderr)
        console.error(`📄 stderr: ${execError.stderr.toString()}`);
      throw error;
    }

    return this.tmpDir;
  }

  /**
   * Adds the nx script to the workspace package.json
   */
  addNxScript(): void {
    try {
      // Read the current package.json
      const packageJsonPath = join(this.tmpDir, 'package.json');
      const fs = require('fs');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Add the nx script if it doesn't exist
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      if (!packageJson.scripts.nx) {
        packageJson.scripts.nx = 'nx';
      }

      // Write back the modified package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Generates a React app in the workspace
   */
  generateReactApp(appName: string = 'guest-app', directory?: string): void {
    const dirFlag = directory ? `--directory=${directory}` : '';
    const command = `pnpm exec nx g @nx/react:app ${appName} ${dirFlag} --style=tailwind --bundler=vite --unitTestRunner=vitest --e2eTestRunner=none --linter=eslint --no-interactive --verbose`;

    this.execCommand(command);
  }

  /**
   * Adds the plugin as a dev dependency pointing to the local tar.gz file
   */
  addPluginAsDevDependency(): void {
    try {
      // Read the current package.json
      const packageJsonPath = join(this.tmpDir, 'package.json');
      const fs = require('fs');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Initialize devDependencies if it doesn't exist
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
      }

      // Add the plugin pointing to the local tar.gz file
      packageJson.devDependencies[
        '@erickrodrcodes/nx-electron-vite'
      ] = `file:./nx-electron-vite.tar.gz`;

      // Write back the modified package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      // Install the dependency with the configured package manager
      this.execCommand(`${this.packageManager} install`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Installs the plugin from Verdaccio registry
   */
  installPluginFromVerdaccio(): void {
    // Configure npm to use Verdaccio registry
    this.execCommand('npm config set registry http://localhost:4873');

    // Install the plugin from Verdaccio
    this.execCommand('npm install nx-electron-vite@latest');
  }

  /**
   * Installs the plugin locally (for development)
   */
  installPluginLocally(): void {
    // Build the plugin (use pnpm in root project)
    execSync('pnpm build', { cwd: rootDir, stdio: 'inherit' });

    // Link the plugin globally
    execSync('npm link', {
      cwd: join(rootDir, 'packages/nx-electron-vite'),
      stdio: 'inherit',
    });

    // Link the plugin in the workspace
    execSync('npm link nx-electron-vite', {
      cwd: this.tmpDir,
      stdio: 'inherit',
    });
  }

  /**
   * Copies the plugin tar.gz file to the workspace
   */
  copyPluginTarGz(): void {
    // The tarball is in the parent directory of the workspace (which is the unique run dir)
    const sourceTarGzPath = join(this.tmpDir, '../nx-electron-vite.tar.gz');
    const targetTarGzPath = join(this.tmpDir, 'nx-electron-vite.tar.gz');

    const fs = require('fs');
    fs.copyFileSync(sourceTarGzPath, targetTarGzPath);
  }

  /**
   * Cleans up the temporary workspace
   */
  async cleanup(): Promise<void> {
    await safeRemoveDir(this.tmpDir);
  }

  /**
   * Gets the workspace directory path
   */
  getWorkspacePath(): string {
    return this.tmpDir;
  }

  /**
   * Executes a command in the workspace
   */
  execCommand(
    command: string,
    options: { stdio?: 'inherit' | 'pipe' } = {}
  ): string {
    const { stdio = 'pipe' } = options;
    let cmd = command;

    if (/npx\s+nx\s+|pnpm\s+exec\s+nx\s+/.test(command)) {
      if (!/--verbose/.test(command)) {
        cmd = command + ' --verbose';
      }
      if (!/--skip-nx-cache/.test(command)) {
        cmd = cmd + ' --skip-nx-cache';
      }
    }

    try {
      return execSync(cmd, {
        cwd: this.tmpDir,
        stdio,
        encoding: 'utf8',
        env: {
          ...process.env,
          NX_DAEMON: 'false', // Disable Nx daemon to avoid conflicts with parent workspace
        },
      });
    } catch (error) {
      const execError = error as any;
      console.error(`❌ Command failed: ${cmd}`);
      if (execError.stdout) {
        console.error(`📄 stdout: ${execError.stdout.toString()}`);
      }
      if (execError.stderr) {
        console.error(`📄 stderr: ${execError.stderr.toString()}`);
      }
      throw error;
    }
  }

  /**
   * Checks if a file exists in the workspace
   */
  fileExists(relativePath: string): boolean {
    return existsSync(join(this.tmpDir, relativePath));
  }

  /**
   * Reads a JSON file from the workspace
   */
  readJsonFile(relativePath: string): any {
    const fs = require('fs');
    const content = fs.readFileSync(join(this.tmpDir, relativePath), 'utf8');
    return JSON.parse(content);
  }
}
