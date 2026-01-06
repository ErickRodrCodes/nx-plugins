import { execSync, spawnSync, SpawnSyncOptions } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rimraf } from 'rimraf';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '../../');
const smokeTestsDir = join(__dirname, '../');

// Tokenize a command string while preserving quoted segments
function splitCommand(command: string): string[] {
  const tokens = command.match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g) || [];
  return tokens.map((token) => token.replace(/^['"](.+)['"]$/, '$1'));
}

function assertSafeTokens(tokens: string[]): void {
  const unsafePattern = /[;&|`$<>]/;
  tokens.forEach((token) => {
    if (unsafePattern.test(token)) {
      throw new Error(`Unsafe token detected in command: ${token}`);
    }
  });
}

function isNxCommand(tokens: string[]): boolean {
  return (
    tokens[0] === 'nx' ||
    (tokens[0] === 'npx' && tokens[1] === 'nx') ||
    (tokens[0] === 'pnpm' && tokens[1] === 'exec' && tokens[2] === 'nx')
  );
}

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

    console.log(`dY"İ Using Nx version from workspace: ${nxVersion}`);
    return nxVersion;
  } catch (error) {
    console.warn(
      `ƒsÿ‹,?  Could not read Nx version from workspace, using latest: ${error}`
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
  private readonly tmpDir: string;
  private packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm';

  private constructor(tmpDir: string) {
    this.tmpDir = tmpDir;
  }

  /**
   * Creates a WorkspaceGenerator with an absolute path
   */
  static fromAbsolutePath(absolutePath: string): WorkspaceGenerator {
    return new WorkspaceGenerator(absolutePath);
  }

  /**
   * Creates a WorkspaceGenerator with a path relative to smoke-tests/tmp/
   */
  static fromRelativePath(
    relativeDirName: string = 'tmp-smoke-test'
  ): WorkspaceGenerator {
    return new WorkspaceGenerator(join(smokeTestsDir, 'tmp', relativeDirName));
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
    const createCommand = [
      'npx',
      '--yes',
      `create-nx-workspace@${nxVersion}`,
      `--name=${name}`,
      `--preset=${preset}`,
      workspaceTypeFlag,
      nxCloudFlag,
      `--package-manager=${packageManager}`,
      skipGitFlag,
      '--interactive=false',
      '--verbose',
    ]
      .filter(Boolean)
      .join(' ');

    this.execCommand(createCommand, {
      cwd: directory,
      stdio: 'inherit',
    });

    return this.tmpDir;
  }

  /**
   * Adds the nx script to the workspace package.json
   */
  addNxScript(): void {
    try {
      // Read the current package.json
      const packageJsonPath = join(this.tmpDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      // Add the nx script if it doesn't exist
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      if (!packageJson.scripts.nx) {
        packageJson.scripts.nx = 'nx';
      }

      // Write back the modified package.json
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
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
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      // Initialize devDependencies if it doesn't exist
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
      }

      // Add the plugin pointing to the local tar.gz file
      packageJson.devDependencies[
        '@erickrodrcodes/nx-electron-vite'
      ] = `file:./nx-electron-vite.tar.gz`;

      // Write back the modified package.json
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

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
   * Executes a command in the workspace safely
   */
  execCommand(
    command: string,
    options: { stdio?: 'inherit' | 'pipe'; cwd?: string } = {}
  ): string {
    const { stdio = 'pipe', cwd } = options;
    let cmd = command;

    if (/npx\s+nx\s+|pnpm\s+exec\s+nx\s+/.test(command)) {
      if (!/--verbose/.test(command)) {
        cmd = command + ' --verbose';
      }
      if (!/--skip-nx-cache/.test(command)) {
        cmd = cmd + ' --skip-nx-cache';
      }
    }

    const tokens = splitCommand(cmd);
    assertSafeTokens(tokens);

    if (tokens.length === 0) {
      throw new Error('No command provided to execCommand');
    }

    // Append Nx flags when command is parsed into tokens
    if (isNxCommand(tokens)) {
      if (!tokens.includes('--verbose')) {
        tokens.push('--verbose');
      }
      if (!tokens.includes('--skip-nx-cache')) {
        tokens.push('--skip-nx-cache');
      }
    }

    const spawnOptions: SpawnSyncOptions = {
      cwd: cwd || this.tmpDir,
      stdio,
      encoding: 'utf8',
      env: {
        ...process.env,
        NX_DAEMON: 'false', // Disable Nx daemon to avoid conflicts with parent workspace
      },
    };

    const commandBinary =
      process.platform === 'win32' && tokens[0] === 'npx'
        ? 'npx.cmd'
        : tokens[0];

    const result = spawnSync(commandBinary, tokens.slice(1), {
      ...spawnOptions,
      shell: process.platform === 'win32',
    });

    if (result.error || result.status !== 0) {
      console.error(`ƒ?O Command failed: ${cmd}`);
      if (result.stdout) {
        console.error(`dY", stdout: ${result.stdout.toString()}`);
      }
      if (result.stderr) {
        console.error(`dY", stderr: ${result.stderr.toString()}`);
      }
      throw (
        result.error || new Error(`Command failed with code ${result.status}`)
      );
    }

    return result.stdout ? result.stdout.toString() : '';
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
    const content = readFileSync(join(this.tmpDir, relativePath), 'utf8');
    return JSON.parse(content);
  }
}
