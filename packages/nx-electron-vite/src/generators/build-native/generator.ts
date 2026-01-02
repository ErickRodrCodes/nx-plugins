import {
  formatFiles,
  GeneratorCallback,
  logger,
  readProjectConfiguration,
  runTasksInSerial,
  Tree,
} from '@nx/devkit';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { rebuildNativeModules } from '../../util/utils';
import { buldNativeSchema } from './schema';

/**
 * Creates directory structure if it doesn't exist
 */
function ensureDirectoryExists(tree: Tree, targetPath: string): void {
  if (!tree.exists(targetPath)) {
    const pathParts = targetPath.split('/');
    let currentPath = '';
    for (const part of pathParts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!tree.exists(currentPath)) {
        tree.write(`${currentPath}/.keep`, '');
      }
    }
  }
}

/**
 * Copy a native module to the target path
 */
function copyNativeModule(
  tree: Tree,
  file: { moduleName: string; nativeFilePath: string },
  targetPath: string
): void {
  const extension = path.extname(file.nativeFilePath);
  const fileName = `${file.moduleName}${extension}`;
  const targetFilePath = `${targetPath}/${fileName}`;

  try {
    ensureDirectoryExists(tree, targetPath);

    const sourceContent = fs.readFileSync(file.nativeFilePath);
    tree.write(targetFilePath, sourceContent);
    logger.info(`📁 Copied ${fileName} to ${targetFilePath}`);
  } catch (e) {
    logger.error(`Unable to write the module ${fileName}: ${e.message}`);
  }
}

/**
 * Get the version of an npm package from node_modules using require.resolve
 */
function getPackageVersion(moduleName: string): string | null {
  try {
    const packageJsonPath = require.resolve(`${moduleName}/package.json`);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || null;
  } catch (e) {
    logger.warn(`⚠️ Could not read version for ${moduleName}: ${e.message}`);
    return null;
  }
}

/**
 * Reference.json structure for tracking native modules
 */
interface ReferenceJson {
  [moduleName: string]: {
    path: string;
    version: string;
  };
}

/**
 * Update reference.json with the built native modules
 */
function updateReferenceJson(
  tree: Tree,
  successfulModules: { moduleName: string; nativeFilePath: string }[],
  targetPath: string
): void {
  const referenceJsonPath = `${targetPath}/reference.json`;

  // Read existing reference.json or create empty object
  let referenceJson: ReferenceJson = {};
  if (tree.exists(referenceJsonPath)) {
    try {
      const content = tree.read(referenceJsonPath, 'utf-8');
      referenceJson = JSON.parse(content || '{}');
    } catch (e) {
      logger.warn(
        `⚠️ Could not parse existing reference.json, creating new one`
      );
      referenceJson = {};
    }
  }

  // Add/update entries for each successful module
  for (const module of successfulModules) {
    const extension = path.extname(module.nativeFilePath);
    const fileName = `${module.moduleName}${extension}`;
    const version = getPackageVersion(module.moduleName);

    referenceJson[module.moduleName] = {
      path: fileName,
      version: version || 'unknown',
    };

    logger.info(
      `📝 Updated reference.json: ${module.moduleName} (${
        version || 'unknown'
      })`
    );
  }

  // Write updated reference.json
  tree.write(referenceJsonPath, JSON.stringify(referenceJson, null, 2));
  logger.info(
    `✅ reference.json updated with ${successfulModules.length} module(s)`
  );
}

export async function _buildNativeGenerator(
  tree: Tree,
  schema: buldNativeSchema
): Promise<GeneratorCallback> {
  const tasks: GeneratorCallback[] = [];

  if (process.argv.includes('--dry-run')) {
    logger.warn(
      'Note: The argument --dry-run is partially supported in this generator.\n- Electron rebuild will be executed to rebuild native node modules.\n- A log of files changed in the tree will be shown, but no changes will be made.\n'
    );
  }

  // Validate npm package name
  if (!schema.npmPackageName || schema.npmPackageName.trim() === '') {
    throw new Error(
      'No modules were provided to rebuild a node binary. Aborting'
    );
  }

  // Determine target path
  let targetPath: string;
  if (schema.hostProject) {
    const getProject = readProjectConfiguration(tree, schema.hostProject);
    if (!getProject) {
      logger.error(
        `there is no app called ${schema.hostProject} in the structure of the monorepo. Aborting`
      );
      process.exit(1);
    }

    // Verify it's an electron-nx-vite project
    const children = tree.children(getProject.root);
    if (!children.includes('electron-nx-vite.config.ts')) {
      throw new Error(
        'The selected project is not an @erickrodrcodes/nx-electron-vite host project. Aborting.'
      );
    }

    if (!getProject.sourceRoot) {
      throw new Error(
        `The project ${schema.hostProject} does not have a sourceRoot defined. Aborting.`
      );
    }

    targetPath = `${getProject.sourceRoot}/main/native`;
  } else if (schema.pathTarget) {
    targetPath = schema.pathTarget;
  } else {
    throw new Error(
      'You must provide either a hostProject or a pathTarget. Aborting.'
    );
  }

  // Parse package names
  const packagesToBuild = schema.npmPackageName.includes(',')
    ? schema.npmPackageName
        .split(',')
        .map((pkg) => pkg.trim())
        .filter(Boolean)
    : [schema.npmPackageName];

  // Rebuild native modules
  const { successful, failed } = await rebuildNativeModules(packagesToBuild);

  // Log results
  if (successful.length > 0) {
    const successfulNames = successful.map((s) => s.moduleName).join(', ');
    logger.info(`✅ Successfully rebuilt modules: ${successfulNames}`);

    // Copy modules to target location
    successful.forEach((file) => copyNativeModule(tree, file, targetPath));

    // Update reference.json with module information
    updateReferenceJson(tree, successful, targetPath);
  }

  if (failed.length > 0) {
    const failedNames = failed.map((f) => f.moduleName).join(', ');
    logger.error(`❌ Failed to rebuild modules: ${failedNames}`);
  }

  return runTasksInSerial(...tasks);
}

export async function buildNativeGenerator(
  tree: Tree,
  schema: buldNativeSchema
): Promise<GeneratorCallback> {
  const installTask = await _buildNativeGenerator(tree, schema);
  await formatFiles(tree);
  return installTask;
}

export default buildNativeGenerator;
