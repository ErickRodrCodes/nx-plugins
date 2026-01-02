import {
  ExecutorContext,
  getPackageManagerCommand,
  logger,
  workspaceRoot,
} from '@nx/devkit';

import { unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path/posix';

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { BuildElectronExecutorSchema } from './schema';

export default async function electronBuildExecutor(
  options: BuildElectronExecutorSchema,
  context: ExecutorContext
) {
  const {
    hostProject,
    hostProjectRoot,
    mainOutputFilename,
    mainOutputPath,
    author,
    description,
  } = options;

  logger.info(
    `🧪 Starting distribution task via Nx dist for electron application for host project ${hostProject}...`
  );

  const workspace = workspaceRoot;

  // Create a temporary configuration file that extends the original one
  // and adds the necessary metadata overrides
  const resolveConfigFile = join(
    hostProjectRoot,
    'src',
    'electron-builder.yml'
  );

  const tempConfigPath = path.join(
    workspace,
    `electron-builder.${hostProject}.temp.json`
  );

  const tempConfig = {
    extends: resolveConfigFile,
    extraMetadata: {
      main: path.join(mainOutputPath, mainOutputFilename),
      author: author,
      description: description,
      // Add name and version to avoid electron-builder looking up the workspace package.json
      name: hostProject,
      version: '0.0.0',
    },
  };

  logger.warn(
    `🧪 Creating temporary electron-builder config at ${tempConfigPath}`
  );
  await writeFile(tempConfigPath, JSON.stringify(tempConfig, null, 2));

  logger.warn(`
🧪 Building Electron App with electron-builder from built files from ${hostProject}...
`);

  // Use spawnSync with shell: false for security (avoids shell injection)
  // Note: On Windows, we need shell: true for .cmd scripts (npx.cmd, pnpm.cmd)
  // The security risk is mitigated by using fixed arguments (no user input in command)
  const pmc = getPackageManagerCommand();
  const isWindows = process.platform === 'win32';

  // Build the command as an array of arguments for security
  const execCommand = pmc.exec.split(' ')[0]; // e.g., 'npx', 'pnpm', 'yarn'
  const execArgs = [
    ...pmc.exec.split(' ').slice(1), // Additional args from package manager (e.g., 'exec' for pnpm)
    'electron-builder',
    `--config=${tempConfigPath}`,
  ].filter(Boolean);

  try {
    const result = spawnSync(execCommand, execArgs, {
      cwd: workspaceRoot,
      stdio: 'inherit',
      encoding: 'utf-8',
      // Windows requires shell: true for .cmd scripts
      // Security is maintained because all arguments are fixed/controlled values
      shell: isWindows,
    });

    if (result.status !== 0) {
      logger.error('Electron build failed.');
      return { success: false };
    }
  } catch (error) {
    logger.error('Electron build failed.');
    return { success: false };
  } finally {
    try {
      await unlink(tempConfigPath);
      logger.info('🧹 Cleaned up temporary config file.');
    } catch (e) {
      logger.warn('⚠️ Failed to clean up temporary config file.');
    }
  }

  logger.warn(`
✅ Electron build completed.`);

  return {
    success: true,
  };
}
