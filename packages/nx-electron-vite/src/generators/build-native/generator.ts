import {
  formatFiles,
  GeneratorCallback,
  logger,
  readProjectConfiguration,
  runTasksInSerial,
  Tree,
} from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';
import { rebuildNativeModules } from '../../util/utils';
import { buldNativeSchema } from './schema';

export async function _buildNativeGenerator(
  tree: Tree,
  schema: buldNativeSchema
) {
  const tasks: GeneratorCallback[] = [];

  if (process.argv.includes('--dry-run')) {
    logger.warn(
      'Note: The argument --dry-run is partially supported in this generator.\n- Electron rebuild will be executed to rebuild native node modules.\n- A log of files changed in the tree will be shown, but no changes will be made.\n'
    );
  }
  // first obtain the host project by name
  const getProject = readProjectConfiguration(tree, schema.hostProject);
  if (!getProject) {
    logger.error(
      `there is no app called ${schema.hostProject} in the structure of the monorepo. Aborting`
    );
    process.exit(1);
  }
  // get the files of the project.
  const children = tree.children(getProject.root);
  if (!children.includes('electron-nx-vite.config.ts')) {
    throw new Error(
      'The selected project is not an @erickrodrcodes/nx-electron-vite host project. Aborting.'
    );
  }

  if (!schema.npmPackageName.length) {
    throw new Error(
      'No modules were provided to rebuild a node binary. Aborting'
    );
  }

  const packagesToBuild = schema.npmPackageName.includes(',')
    ? schema.npmPackageName.split(',')
    : [schema.npmPackageName];

  const { successful, failed } = await rebuildNativeModules(packagesToBuild);
  // Log summary
  if (successful.length > 0) {
    logger.info(
      `✅ Successfully rebuilt modules: ${successful
        .map((s) => s.moduleName)
        .join(', ')}`
    );
  }
  if (failed.length > 0) {
    logger.error(
      `❌ Failed to rebuild modules: ${failed
        .map((f) => f.moduleName)
        .join(', ')}`
    );
  }

  //copy the respective native files to the respective project
  for (const file of successful) {
    const extension = path.extname(file.nativeFilePath);
    try {
      if (!tree.exists(`${getProject.sourceRoot}/main/native`)) {
        tree.write(`${getProject.sourceRoot}/main/native/.keep`, '');
      }
      const sourceContent = fs.readFileSync(file.nativeFilePath);
      tree.write(
        `${getProject.sourceRoot}/main/native/${file.moduleName}${extension}`,
        sourceContent
      );
      logger.info(
        `📁 Copied ${file.moduleName}${extension} to ${getProject.sourceRoot}/main/native/${file.moduleName}${extension}`
      );
    } catch (e) {
      logger.error(
        `Unable to write the module ${file.moduleName}${extension}: ${e.message}`
      );
    }
  }

  return runTasksInSerial(...tasks);
}

export async function buildNativeGenerator(
  tree: Tree,
  schema: buldNativeSchema
) {
  const installTask = await _buildNativeGenerator(tree, schema);
  await formatFiles(tree);
  return installTask;
}

export default buildNativeGenerator;
