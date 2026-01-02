import {
  ExecutorContext,
  getPackageManagerCommand,
  logger,
  workspaceRoot,
} from '@nx/devkit';

import { unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path/posix';

import { execSync } from 'node:child_process';
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

  logger.warn(
    `
===============================
⚠️ ⚠️ ⚠️  Important ⚠️ ⚠️ ⚠️

This executor uses a temporary electron-builder configuration file.
Multiple builds can run in sequence, but ensure each build completes before starting another.

The dist folder will be cleaned while running this executor.
===============================
  `
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

  const commandLine = `${
    getPackageManagerCommand().exec
  } electron-builder --config=${tempConfigPath}`;

  try {
    execSync(commandLine, {
      cwd: workspaceRoot,
      stdio: 'inherit',
      encoding: 'utf-8',
    });
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
