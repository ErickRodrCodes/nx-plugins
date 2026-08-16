import { execSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rimraf } from 'rimraf';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '../../');
const smokeTestsDir = join(__dirname, '../');

async function safeRemoveDir(dir: string): Promise<void> {
  if (!existsSync(dir)) return;
  await rimraf(dir, { maxRetries: 3 });
}

function getNxVersionFromWorkspace(): string {
  const packageJsonPath = join(rootDir, 'package.json');
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const nxVersion =
      packageJson.devDependencies?.nx || packageJson.dependencies?.nx;

    if (!nxVersion) {
      throw new Error('Nx version not found in workspace package.json');
    }

    console.log(`📦 Using Nx version from workspace: ${nxVersion}`);
    return nxVersion;
  } catch (error) {
    console.warn(
      `⚠️  Could not read Nx version from workspace, using latest: ${error}`,
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

  static fromAbsolutePath(absolutePath: string): WorkspaceGenerator {
    return new WorkspaceGenerator(absolutePath);
  }

  static fromRelativePath(
    relativeDirName: string = 'tmp-smoke-test',
  ): WorkspaceGenerator {
    return new WorkspaceGenerator(join(smokeTestsDir, 'tmp', relativeDirName));
  }

  async createWorkspace(options: WorkspaceOptions = {}): Promise<string> {
    const {
      name = 'tmp-smoke-test',
      preset = 'apps',
      packageManager = 'npm',
      skipGit = true,
      nxCloud = false,
      directory = options.directory || process.cwd(),
    } = options;

    this.packageManager = packageManager;

    if (existsSync(this.tmpDir)) {
      await safeRemoveDir(this.tmpDir);
    }

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
      const execError = error as {
        stdout?: Buffer | string;
        stderr?: Buffer | string;
      };
      if (execError.stdout)
        console.error(`📄 stdout: ${execError.stdout.toString()}`);
      if (execError.stderr)
        console.error(`📄 stderr: ${execError.stderr.toString()}`);
      throw error;
    }

    return this.tmpDir;
  }

  /**
   * Prefix for running Nx in the temp workspace (matches create-nx-workspace PM).
   */
  nxCli(): string {
    switch (this.packageManager) {
      case 'pnpm':
        return 'pnpm exec nx';
      case 'yarn':
        return 'yarn nx';
      default:
        return 'npx nx';
    }
  }

  generateReactApp(appName: string = 'guest-app', directory?: string): void {
    const dirFlag = directory ? `--directory=${directory}` : '';
    // Nx 23+: style must be css | scss | none (tailwind removed from schema)
    const command = `${this.nxCli()} g @nx/react:app ${appName} ${dirFlag} --style=css --bundler=vite --unitTestRunner=vitest --e2eTestRunner=none --linter=eslint --no-interactive`;
    this.execCommand(command);
  }

  addPluginAsDevDependency(): void {
    const packageJsonPath = join(this.tmpDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }

    packageJson.devDependencies['@erickrodrcodes/nx-electron-vite'] =
      'file:./nx-electron-vite.tar.gz';

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    this.execCommand(`${this.packageManager} install`);
  }

  copyPluginTarGz(): void {
    const sourceTarGzPath = join(this.tmpDir, '../nx-electron-vite.tar.gz');
    const targetTarGzPath = join(this.tmpDir, 'nx-electron-vite.tar.gz');
    copyFileSync(sourceTarGzPath, targetTarGzPath);
  }

  async cleanup(): Promise<void> {
    await safeRemoveDir(this.tmpDir);
  }

  getWorkspacePath(): string {
    return this.tmpDir;
  }

  getPackageManager(): 'npm' | 'yarn' | 'pnpm' {
    return this.packageManager;
  }

  execCommand(
    command: string,
    options: { stdio?: 'inherit' | 'pipe' } = {},
  ): string {
    const { stdio = 'pipe' } = options;
    let cmd = command;

    if (/\bnx\s+/.test(command)) {
      if (!/--verbose/.test(command)) {
        cmd = `${cmd} --verbose`;
      }
      if (!/--skip-nx-cache/.test(command)) {
        cmd = `${cmd} --skip-nx-cache`;
      }
    }

    try {
      return execSync(cmd, {
        cwd: this.tmpDir,
        stdio,
        encoding: 'utf8',
        env: {
          ...process.env,
          NX_DAEMON: 'false',
        },
      });
    } catch (error) {
      const execError = error as {
        stdout?: Buffer | string;
        stderr?: Buffer | string;
      };
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

  fileExists(relativePath: string): boolean {
    return existsSync(join(this.tmpDir, relativePath));
  }

  readJsonFile(relativePath: string): Record<string, unknown> {
    const content = readFileSync(join(this.tmpDir, relativePath), 'utf8');
    return JSON.parse(content);
  }

  readTextFile(relativePath: string): string {
    return readFileSync(join(this.tmpDir, relativePath), 'utf8');
  }

  listDir(relativePath: string): string[] {
    const abs = join(this.tmpDir, relativePath);
    if (!existsSync(abs)) return [];
    return readdirSync(abs);
  }

  findInstallerArtifact(executableName: string): string | null {
    const distDir = join(this.tmpDir, 'dist');
    if (!existsSync(distDir)) return null;

    const pattern = `${executableName}-0.0.0-setup`;
    const extensions = [
      'exe',
      'dmg',
      'pkg',
      'deb',
      'rpm',
      'AppImage',
      'tar.gz',
      'zip',
    ];

    for (const ext of extensions) {
      const relative = `dist/${pattern}.${ext}`;
      if (this.fileExists(relative)) return relative;
    }

    if (this.fileExists(`dist/${pattern}`)) return `dist/${pattern}`;

    // Fallback: any file in dist that starts with the executable pattern
    try {
      const entries = readdirSync(distDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.startsWith(pattern)) {
          return `dist/${entry.name}`;
        }
      }
    } catch {
      // ignore
    }

    return null;
  }
}
