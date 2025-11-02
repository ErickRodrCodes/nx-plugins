import {
  addDependenciesToPackageJson,
  GeneratorCallback,
  getPackageManagerCommand,
  getWorkspaceLayout,
  logger,
  NX_VERSION,
  offsetFromRoot,
  readProjectConfiguration,
  removeDependenciesFromPackageJson,
  Tree,
  workspaceRoot,
} from '@nx/devkit';

import { rebuild } from '@electron/rebuild';

import { determineProjectNameAndRootOptions } from '@nx/devkit/src/generators/project-name-and-root-utils';
import { ChildProcess, exec } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { readdir } from 'node:fs/promises';
import * as path from 'path';
import { resolve } from 'path';
import { exit, platform } from 'process';
import { SetupProjectSchema } from '../generators/setup-project/schema';
import { versionLibraries } from './versions';

/**
 * Represents the operating system platform.
 */
export const osPlatform: typeof process.platform = process.platform;

/**
 * Represents command parameters for icon resolution.
 */
export interface CommandParams {
  hostProjectRoot: string; // The root directory of the host project.
  hostProject: string; // The name of the host project.
  osPlatform: typeof platform; // The operating system platform.
  iconOutputPath: string; // The path where icons will be output.
}

/**
 * Represents command parameters for resolving icon commands.
 */
export interface ResolveIconCommandParams extends CommandParams {
  type: 'icon' | 'setup'; // Type of the icon command.
}

/**
 * Represents the result of rebuilding native modules.
 */
export interface RebuildResult {
  successful: Array<{ moduleName: string; nativeFilePath: string }>; // Successfully rebuilt modules
  failed: Array<{ moduleName: string; error: string }>; // Modules that failed to rebuild
}

/**
 * Retrieves the output directory for a specified project.
 * @param {Tree} tree - Represents the file system.
 * @param {string} projectName - The name of the project.
 * @returns {Promise<string>} - The output directory path for the project.
 */
export async function getProjectOutputDirectory(
  tree: Tree,
  projectName: string
): Promise<string> {
  const options = readProjectConfiguration(tree, projectName);
  if (options.targets?.build?.options?.outputPath) {
    return options.targets.build.options.outputPath.replace(/\.\.\//g, '');
  } else {
    const viteOutputPath = await getViteOutputPath(tree, projectName);
    if (viteOutputPath !== '') {
      return viteOutputPath;
    }
    logger.warn(
      `Could not find the output path for project ${projectName}. The value 'OUTPUT_DIST_GUEST_PROJECT' will be used for you to change manually on the generated files.`
    );
    return 'OUTPUT_DIST_GUEST_PROJECT';
  }
}

/**
 * Retrieves the output path from the Vite configuration for a specified project.
 * @param {Tree} tree - Represents the file system.
 * @param {string} projectName - The name of the project.
 * @returns {Promise<string>} - The output path specified in the Vite configuration.
 * @throws {Error} If the Vite configuration file cannot be read.
 */
export async function getViteOutputPath(
  tree: Tree,
  projectName: string
): Promise<string> {
  const projectConfig = readProjectConfiguration(tree, projectName);
  const viteConfigPath = path.posix.join(projectConfig.root, 'vite.config.ts');

  if (!tree.exists(viteConfigPath)) {
    return '';
  }

  const viteConfigContent = tree.read(viteConfigPath, 'utf-8');
  if (!viteConfigContent) {
    throw new Error(
      `Unable to read Vite configuration file: ${viteConfigPath}`
    );
  }
  const viteConfig = await import(path.resolve(viteConfigPath));

  // Dynamically import the Vite config file
  if (viteConfig?.default?.build?.outDir) {
    const outputPath = viteConfig.default.build.outDir;
    return outputPath.replace(/\.\.\//g, '');
  }
  return '';
}

/**
 * Normalizes options for setting up a project.
 * @param {Tree} tree - Represents the file system.
 * @param {SetupProjectSchema} schema - The schema containing project setup options.
 * @returns {Promise<SetupProjectSchema>} - The normalized project options.
 */
export async function normalizeOptions(
  tree: Tree,
  schema: SetupProjectSchema
): Promise<SetupProjectSchema> {
  // Normalize project name: use guestProject-electron only if nameProject is undefined, null, empty string or whitespace
  const projectName =
    schema.nameProject === undefined ||
    schema.nameProject === null ||
    schema.nameProject.trim() === ''
      ? `${schema.guestProject}-electron`
      : schema.nameProject;

  // If directory is undefined, empty, or just whitespace, use workspace layout default
  const { appsDir } = getWorkspaceLayout(tree);
  const directory =
    !schema.directory || schema.directory.trim() === ''
      ? appsDir
      : schema.directory.trim();

  // Let Nx determine the final project name and root directory
  const newProject = await determineProjectNameAndRootOptions(tree, {
    name: projectName,
    projectType: 'application',
    directory: directory,
  });

  // Ensure the directory path is correctly constructed
  const projectDirectory = path.posix.join(directory, projectName);

  const outputGuestDirectory = await getProjectOutputDirectory(
    tree,
    schema.guestProject
  );

  const options: SetupProjectSchema = {
    directory: projectDirectory,
    directoryRoot: path.posix.join(projectDirectory, 'src'),
    guestProject: schema.guestProject,
    nameProject: newProject.projectName,
    name: schema.name,
    author: schema.author,
    description: schema.description,
    executableName: schema.executableName,
    updater: schema.updater,
    testRunner: schema.testRunner,
    guestDistFolder: outputGuestDirectory,
    outputDistFolderIcons: `dist/${projectDirectory}-icons`,
    outputDistFolder: `dist/${projectDirectory}`,
    directoryResources: path.posix.join(projectDirectory, 'src/resources'),
    offsetFromRoot: offsetFromRoot(projectDirectory),
    rootTsConfigPath: `${offsetFromRoot(
      projectDirectory
    )}${getRootTsConfigPath()}`,
    nsisExtraFilePath: path.posix.join(projectDirectory, 'src/installer.nsh'),
  };

  return options;
}

/**
 * Checks if a project is an application.
 * @param {Tree} tree - Represents the file system.
 * @param {string} guestProject - The name of the guest project.
 * @returns {Promise<boolean>} - True if the project is an application, otherwise false.
 */
export const isApplication = async (
  tree: Tree,
  guestProject: string
): Promise<boolean> => {
  const project = readProjectConfiguration(tree, guestProject);
  return project.projectType === 'application';
};

/**
 * Retrieves the root TypeScript configuration file path.
 * @returns {string|null} - The path to the root TypeScript configuration file or null if not found.
 */
export function getRootTsConfigPath(): string | null {
  const tsConfigFileName = getRootTsConfigFileName();
  return tsConfigFileName || null;
}

/**
 * Gets the name of the root TypeScript configuration file.
 * @returns {string|null} - The name of the TypeScript configuration file or null if not found.
 */
function getRootTsConfigFileName(): string | null {
  for (const tsConfigName of ['tsconfig.base.json', 'tsconfig.json']) {
    const tsConfigPath = path.posix.join(workspaceRoot, tsConfigName);
    if (existsSync(tsConfigPath)) {
      return tsConfigName;
    }
  }

  return null;
}

/**
 * Checks if the current Node.js version meets the suggested version.
 * If the current version is lower than the suggested version, an error is thrown.
 * @param {string} currentVersion - The current Node.js version.
 * @param {string} suggestedNodeVersion - The suggested Node.js version.
 * @throws {Error} If the current Node.js version is lower than the suggested version.
 */
export const checkNodeVersion = (
  currentVersion: string,
  suggestedNodeVersion: string
): void => {
  if (compareNodeVersion(currentVersion, suggestedNodeVersion) === -1) {
    throw new Error(
      `Your current node version ${currentVersion} is lower than the suggested version ${suggestedNodeVersion}. Please update your node version to ${suggestedNodeVersion} or higher.`
    );
  }
};

/**
 * Cleans up dependencies from the package.json file.
 * @param {Tree} tree - Represents the file system.
 * @param {SetupProjectSchema} schema - The schema containing project setup options.
 * @returns {Promise<void>} - A promise that resolves when the cleanup is complete.
 */
export const cleanupDependencies = async (
  tree: Tree,
  schema: SetupProjectSchema
): Promise<GeneratorCallback> => {
  const devDependencies: string[] = [
    '@nx/web',
    'electron-builder',
    '@electron/rebuild',
    'electron',
    'vite-plugin-electron-renderer',
    'vite-plugin-electron',
    'png2icons',
  ];

  if (schema.testRunner && schema.testRunner === 'vitest') {
    devDependencies.push('vitest');
  }

  return removeDependenciesFromPackageJson(tree, [], devDependencies);
};

/**
 * Installs dependencies for the project.
 * @param {Tree} tree - Represents the file system.
 * @param {SetupProjectSchema} schema - The schema containing project setup options.
 * @returns {Promise<GeneratorCallback>} - A promise that resolves with a callback for the generator.
 */
export const installDependencies = async (
  tree: Tree,
  schema: SetupProjectSchema
): Promise<GeneratorCallback> => {
  // First check the current node version
  checkNodeVersion(process.versions.node, versionLibraries.node);

  const devDependencies = {
    '@nx/web': NX_VERSION,
    'electron-builder': versionLibraries.electronBuilder,
    '@electron/rebuild': versionLibraries.electronRebuild,
    electron: versionLibraries.electron,
    'vite-plugin-electron-renderer':
      versionLibraries.vitePluginElectronRenderer,
    'vite-plugin-electron': versionLibraries.vitePluginElectron,
    png2icons: versionLibraries.png2icons,
  };
  const dependencies = {};

  if (schema.testRunner && schema.testRunner === 'vitest') {
    devDependencies['vitest'] = versionLibraries.vitest;
  }

  return await addDependenciesToPackageJson(
    tree,
    dependencies,
    devDependencies
  );
};

/**
 * Compares two Node.js versions to determine if one is greater than the other.
 * @param {string} version1 - The first version to compare.
 * @param {string} version2 - The second version to compare.
 * @returns {number} - Returns 1 if version1 is greater, -1 if version2 is greater, or 0 if they are equal.
 */
export function compareNodeVersion(version1: string, version2: string): number {
  const v1 = version1.replace('v', '').split('.').map(Number);
  const v2 = version2.replace('v', '').split('.').map(Number);
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const v1part = v1[i] || 0;
    const v2part = v2[i] || 0;
    if (v1part > v2part) {
      return 1; // version1 is greater
    } else if (v1part < v2part) {
      return -1; // version2 is greater
    }
  }
  return 0; // versions are equal
}

/**
 * Runs a command until a specified criteria is met.
 * @param {string} command - The command to run.
 * @param {(output: string) => boolean} criteria - The criteria to meet as a text output. If the criteria is met, the promise resolves.
 * @returns {Promise<ChildProcess>} - A promise that resolves when the criteria is met.
 */
export function runCommandUntil(
  command: string,
  criteria: (output: string) => boolean
): Promise<ChildProcess> {
  const pathToWorkspace = resolve(workspaceRoot);
  const p = exec(`${command}`, {
    encoding: 'utf-8',
    cwd: pathToWorkspace,
  });
  return new Promise((res, rej) => {
    let output = '';
    let complete = false;

    function checkCriteria(data: string) {
      output += data;
      if (criteria(output)) {
        complete = true;
        res(p);
      }
    }

    p.stdout?.on('data', checkCriteria);
    p.stderr?.on('data', checkCriteria);
    p.stdout?.on('data', (data) => process.stdout.write(data));
    p.stderr?.on('data', (data) => process.stderr.write(data));
    p.on('exit', (code) => {
      if (!complete) {
        rej(new Error(`Exited with ${code}`));
      } else {
        res(p);
      }
    });
    p.stderr.on('error', (error) => {
      logger.error(error);
      rej(error instanceof Error ? error : new Error(error));
    });
  });
}

/**
 * Restores the package.json file to its original state.
 * @param {string} workspace - The path to the workspace.
 * @param {object} originalPackageJson - The original package.json object.
 * @returns {Promise<void>} - A promise that resolves when the restoration is complete.
 */
export async function restorePackageJson(
  workspace: string,
  originalPackageJson: object
): Promise<void> {
  await writeFile(
    path.posix.join(workspace, 'package.json'),
    JSON.stringify(originalPackageJson, null, 2)
  );
}

/**
 * Deletes a directory and its contents.
 * @param {string} directoryPath - The path to the directory to delete.
 * @returns {Promise<void>} - A promise that resolves when the directory is deleted.
 * @throws {Error} If there is an error deleting the directory.
 */
export async function deleteDirectory(directoryPath: string): Promise<void> {
  try {
    await rm(directoryPath, { recursive: true, force: true });
    logger.warn(`🗑️  Directory ${directoryPath} deleted successfully.`);
  } catch (error) {
    logger.error(`⚠️ Error deleting directory ${directoryPath}:`);
    logger.error(error);
    exit(1);
  }
}

/**
 * Represents the result of rebuilding native modules.
 */
export interface RebuildResult {
  successful: Array<{ moduleName: string; nativeFilePath: string }>; // Successfully rebuilt modules
  failed: Array<{ moduleName: string; error: string }>; // Modules that failed to rebuild
}

/**
 * Resolves the icon command parameters and ensures the output directory exists.
 * @param {ResolveIconCommandParams} params - The parameters for resolving the icon command.
 * @returns {Promise<string>} - The command to execute for icon generation.
 */
export async function resolveIconCommand(
  params: ResolveIconCommandParams
): Promise<string> {
  if (!existsSync(params.iconOutputPath)) {
    await mkdir(params.iconOutputPath, { recursive: true });
  }

  const resolveSourceFile = path.posix.join(
    params.hostProjectRoot,
    'src',
    'resources',
    'icon',
    'source',
    `${params.type}.png`
  );
  const resolveTargetFile = path.posix.join(params.iconOutputPath, params.type);

  const _args = ` ${params.osPlatform === 'darwin' ? '-icns' : '-icop'} -hm -i`;
  return `${
    getPackageManagerCommand().exec
  } png2icons ${resolveSourceFile} ${resolveTargetFile} ${_args}`;
}

/**
 * Validates if a module exists in node_modules.
 * @param {string} moduleName - The name of the module to check.
 * @returns {Promise<boolean>} - True if the module exists, otherwise false.
 */
async function validateModule(moduleName: string): Promise<boolean> {
  try {
    require.resolve(`${moduleName}/package.json`);
    return true;
  } catch {
    logger.error(`❌ Module "${moduleName}" not found in node_modules`);
    return false;
  }
}

/**
 * Rebuilds one or more native modules for Electron.
 * @param {string|string[]} moduleNames - Single module name or array of module names.
 * @returns {Promise<RebuildResult>} - An object containing arrays of successful and failed rebuilds.
 * @throws {Error} If any module is invalid or if the rebuild process fails.
 */
export async function rebuildNativeModules(
  moduleNames: string | string[]
): Promise<RebuildResult> {
  // Ensure moduleNames is always an array
  const modules = Array.isArray(moduleNames) ? moduleNames : [moduleNames];

  if (modules.length === 0) {
    console.warn('⚠️ No modules specified for rebuilding');
    return { successful: [], failed: [] };
  }

  // Validate all modules first
  logger.info('🔍 Validating modules...');
  const validationResults = await Promise.all(
    modules.map(async (moduleName) => ({
      moduleName,
      exists: await validateModule(moduleName),
    }))
  );

  // Filter out invalid modules
  const invalidModules = validationResults.filter((result) => !result.exists);
  const validModules = validationResults
    .filter((result) => result.exists)
    .map((result) => result.moduleName);

  // Early exit if any module is invalid
  if (invalidModules.length > 0) {
    const invalidModuleNames = invalidModules
      .map((m) => m.moduleName)
      .join(', ');
    throw new Error(
      `Cannot proceed with rebuild. Missing modules: ${invalidModuleNames}`
    );
  }

  // If we get here, all modules are valid
  logger.info('✅ All modules validated successfully');
  const successful = [];
  const failed = [];

  // Proceed with rebuilding all valid modules
  for (const moduleName of validModules) {
    try {
      logger.info(`📦 Rebuilding ${moduleName}...`);

      await rebuild({
        buildPath: workspaceRoot,
        force: true,
        onlyModules: [moduleName],
        electronVersion: versionLibraries.electron.replace('^', ''),
      });

      const nativeFilePath = await getNativeAddonFile(moduleName);
      successful.push({ moduleName, nativeFilePath });
      logger.info(`✅ Successfully rebuilt ${moduleName}`);
    } catch (error) {
      logger.error(`❌ Failed to rebuild ${moduleName}: ${error.message}`);
      failed.push({
        moduleName,
        error: error.message || 'Unknown error occurred during rebuild',
      });
    }
  }

  return { successful, failed };
}

/**
 * Locates the native addon (.node) file for a given module.
 * @param {string} moduleName - Name of the module.
 * @returns {Promise<string>} - Path to the .node file.
 * @throws {Error} If the native addon file cannot be found.
 */
async function getNativeAddonFile(moduleName: string): Promise<string> {
  try {
    const modulePackagePath = require.resolve(`${moduleName}/package.json`);
    const moduleFolder = path.dirname(modulePackagePath);

    const nodeFile = await findNodeFile(moduleFolder);
    if (!nodeFile) {
      throw new Error(
        `No .node file found for "${moduleName}" in ${moduleFolder}`
      );
    }

    return nodeFile;
  } catch (error) {
    throw new Error(
      `Failed to locate native addon for "${moduleName}": ${error.message}`
    );
  }
}

/**
 * Recursively searches for a .node file in a directory.
 * @param {string} directory - Directory to search in.
 * @returns {Promise<string|null>} - Path to the .node file or null if not found.
 * @throws {Error} If there's an error accessing the directory.
 */
async function findNodeFile(directory: string): Promise<string | null> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.posix.join(directory, entry.name);

    if (entry.isFile() && path.extname(entry.name) === '.node') {
      return fullPath;
    }

    if (entry.isDirectory()) {
      const result = await findNodeFile(fullPath);
      if (result) return result;
    }
  }

  return null;
}
