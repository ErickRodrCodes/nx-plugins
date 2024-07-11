import {
  ExecutorContext,
  workspaceRoot,
  logger,
  runExecutor,
  getPackageManagerCommand,
} from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import * as path from 'node:path/posix';

import { BuildElectronExecutorSchema } from './schema';
import {
  deleteDirectory,
  restorePackageJson,
  runCommandUntil,
} from '../../util/utils';
import { join } from 'node:path';

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

NEVER run this executor in parallel with other nx-electron-vite builders or a custom electron build.
It will write the package.json of the workspace to define the main js target file for your project.
Our advice is to run multiple nx-electron-vite projects in sequence to prevent undesired side effects.

The dist folder will be cleaned while running this executor.
===============================
  `
  );

  await deleteDirectory('./dist');

  const workspace = workspaceRoot;
  const packageJson = readFileSync(
    path.join(workspace, 'package.json'),
    'utf-8'
  );
  const originalPackageJson = JSON.parse(packageJson);
  const parsedPackageJson = JSON.parse(packageJson);
  parsedPackageJson.main = path.join(mainOutputPath, mainOutputFilename);
  parsedPackageJson.author = author;
  parsedPackageJson.description = description;
  // TODO: add author and description to package.json

  logger.warn(`🧪 Updating package.json to be used on the build process.`);
  await writeFile(
    path.join(workspace, 'package.json'),
    JSON.stringify(parsedPackageJson, null, 2)
  );

  logger.warn(`🧪 Running nx run ${hostProject}:build to generate nx-electron-vite build files...
`);

  for await (const result of await runExecutor(
    { project: hostProject, target: 'build' },
    {},
    context
  )) {
    if (!result.success) {
      logger.error('Build failed.');
      await restorePackageJson(workspace, originalPackageJson);
      return { success: false };
    }
  }

  logger.warn(`🧪 Running nx run ${hostProject}:nx-electron-icons to generate to generate the set of icons for application and setup files...
`);

  for await (const result of await runExecutor(
    { project: hostProject, target: 'nx-electron-icons' },
    {},
    context
  )) {
    if (!result.success) {
      logger.error('Build failed.');
      await restorePackageJson(workspace, originalPackageJson);
      return { success: false };
    }
  }

  logger.warn(`
🧪 Building Electron App with electron-builder from built files from ${hostProject}...
`);

  const resolveConfigFile = join(
    hostProjectRoot,
    'electron',
    'electron-builder.yml'
  );
  const commandLine = `${
    getPackageManagerCommand().exec
  } electron-builder --config=${resolveConfigFile}`;

  try {
    await runCommandUntil(commandLine, (criteria) =>
      criteria.includes('building block map')
    );
  } catch (error) {
    logger.error('Electron build failed.');
    await restorePackageJson(workspace, originalPackageJson);
    return { success: false };
  }

  logger.warn(`
✅ Electron build completed. Restoring package.json...`);
  await restorePackageJson(workspace, originalPackageJson);

  return {
    success: true,
  };
}
