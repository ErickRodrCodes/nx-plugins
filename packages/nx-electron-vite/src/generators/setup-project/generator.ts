import {
  formatFiles,
  generateFiles,
  Tree,
  readJson,
  writeJson,
  getProjects,
  GeneratorCallback,
  runTasksInSerial,
  readProjectConfiguration,
  updateProjectConfiguration,
  workspaceRoot,
  logger,
  ProjectConfiguration,
} from '@nx/devkit';
import * as path from 'node:path';
import { InitGeneratorSchema } from './schema';
import { compareNodeVersion } from '../../util/utils';
import { injectViteConfig } from '../../util/injectViteConfig';
import { suggestedNodeVersion } from '../../util/versions';

export function updateDependencies(tree: Tree, options: InitGeneratorSchema) {
  const tasks: GeneratorCallback[] = [];

  //find the project and obtain the relative path so we can read the vite config
  const projects = getProjects(tree);
  const packageJson = {
    contents: readJson(tree, 'package.json'),
  };
  const rootProject = projects.get(options.hostProject);
  options.hostProjectRoot = rootProject.root;

  const extraParams = {
    workspace:
      packageJson.contents.name[0] === '@'
        ? String(packageJson.contents.name)
            .substring(1)
            .replace(/[^a-zA-Z0-9]/g, '_')
        : String(packageJson.contents.name).replace(/[^a-zA-Z0-9]/g, '_'),
    hostProjectDistFolder: 'dist/apps/' + options.hostProject,
    nsisExtraFilePath: path.join(
      process.cwd(),
      rootProject.root,
      'electron',
      'install.nsh'
    ),
  };

  const currentVersion = process.version;

  const viteConfigPath = checkViteConfig(rootProject, tree, options);
  //check if the root project is an application
  checkRootProject(rootProject, options);

  //check if the node version is higher than the suggested version
  checkNodeVersion(currentVersion, suggestedNodeVersion);

  //check if the workspace package.json type property is "module", if not add it, otherwise throw an error
  checkPackageJsonType(packageJson, tree);

  //check if electronNxViteConfig is already in the vite.config.ts file
  checkNxElectronViteConfig(viteConfigPath, tree, options);

  //parses properly the html header for the electron app
  parseHeaderHtmlForElectronApp(tree, rootProject);

  // if a tailwinds, fix the respective import to cjs
  fixTailwindsSetup(rootProject, tree, options);

  // if a jest config exists on the project, fix not only the current configuration, but change the main preset to use cjs
  fixJestSetup(rootProject, tree, options);

  tree.write(viteConfigPath, injectViteConfig(viteConfigPath, tree));

  //update the project configuration to include the new targets
  updateTargetProject(tree, options);

  generateFiles(tree, path.join(__dirname, 'files'), rootProject.root, {
    ...options,
    ...extraParams,
  });

  return runTasksInSerial(...tasks);
}

export async function initGenerator(tree: Tree, schema: InitGeneratorSchema) {
  const installTask = updateDependencies(tree, schema);
  await formatFiles(tree);
  return installTask;
}

/**
 * To make testing easier, we are exporting the function that will be called by the executor
 */

/**
 * Checks if the root project meets required criteria.
 *
 * @param rootProject - The project to validate.
 * @param options - Contains `hostProject` to specify the project name.
 * @throws Error if project not found or not an application.
 */
export const checkRootProject = (
  rootProject: ProjectConfiguration,
  options
) => {
  if (!rootProject) {
    throw new Error(`Could not find project with name ${options.hostProject}`);
  } else if (rootProject.projectType !== 'application') {
    throw new Error(
      `The Host Project with name ${options.hostProject} is not an application project. Please provide the name of an application project.`
    );
  }
};

/**
 * Validates existence of Vite config in the root project.
 *
 * @param rootProject - The project being checked.
 * @param tree - Represents the file system.
 * @param options - Additional options, unused here.
 * @throws Error if Vite config is missing.
 */
export const checkViteConfig = (
  rootProject: ProjectConfiguration,
  tree,
  options: InitGeneratorSchema
) => {
  const viteConfigPath = path.join(rootProject.root, 'vite.config.ts');
  if (!tree.exists(viteConfigPath)) {
    throw new Error(
      `Could not find vite.config.ts in the root of the project ${options.hostProject}`
    );
  }

  return viteConfigPath;
};

/**
 * Ensures package.json has 'module' type.
 *
 * @param tree - File system access.
 * @param rootProject - Project config.
 */
export const checkPackageJsonType = (
  packageJson: { contents: Record<string, string> },
  tree
) => {
  if (!Object.keys(packageJson.contents).includes('type')) {
    packageJson.contents.type = 'module';
    writeJson(tree, 'package.json', packageJson.contents);
    logger.warn(
      '🚨 IMPORTANT 🚨 : Added type module to workspace package.json. This has several implications when running things like jest or tailwinds on the cli side. Type "Module" is required for nx-electron-vite to develop and build electron applications'
    );
  } else if (packageJson.contents.type !== 'module') {
    throw new Error(
      `Workspace package.json contains a type that is "${packageJson.contents.type}". Note that type "module" is required for nx-electron-vite to work properly.`
    );
  }
};

/**
 * Validates the `type` field in the project's package.json.
 *
 * @param rootProject - The project to validate.
 * @param tree - Represents the file system.
 * @throws Error if `type` is not 'module'.
 */
export const checkNodeVersion = (
  currentVersion: string,
  suggestedNodeVersion: string
) => {
  if (compareNodeVersion(currentVersion, suggestedNodeVersion) === -1) {
    throw new Error(
      `Your current node version ${currentVersion} is lower than the suggested version ${suggestedNodeVersion}. Please update your node version to ${suggestedNodeVersion} or higher.`
    );
  }
};

/**
 * Ensures no duplicate Nx Electron Vite config in vite.config.ts.
 *
 * Reads the project's vite.config.ts file and checks if it already contains an Nx Electron Vite configuration.
 * If found, it throws an error to prevent duplication of configuration.
 *
 * @param viteConfigPath - The path to the vite.config.ts file.
 * @param tree - Access to the file system.
 * @param options - Schema options for initialization, used to identify the host project.
 * @throws Error if an Nx Electron Vite configuration is already present.
 */
export const checkNxElectronViteConfig = (
  viteConfigPath: string,
  tree: Tree,
  options: InitGeneratorSchema
) => {
  // read the project's vite config and add a new target for electron to build, which
  // requires to build first the vite project and then the electron project
  const contents = tree.read(viteConfigPath)?.toString() || '';
  if (contents.includes('electronNxViteConfig')) {
    throw new Error(
      `The project "${options.hostProject}" already contains an Nx Electron Vite implementation. Aborting.`
    );
  }
};

/**
 * Adjusts the `index.html` for Electron compatibility.
 *
 * This function modifies the base href and adds Content Security Policy meta tags to the `index.html` of the root project.
 * It ensures the application can be loaded correctly in an Electron environment by adjusting paths and enhancing security.
 *
 * @param tree - Represents the file system.
 * @param rootProject - The project configuration object.
 */
export const parseHeaderHtmlForElectronApp = (
  tree: Tree,
  rootProject: ProjectConfiguration
) => {
  const indexHtmlPath = path.join(rootProject.root, 'index.html');
  if (tree.exists(indexHtmlPath)) {
    let indexHtml = tree.read(indexHtmlPath)?.toString();
    if (indexHtml.includes('<base href="/" />')) {
      indexHtml = indexHtml.replace('<base href="/" />', '<base href="./" />');
    }

    if (!indexHtml.includes('http-equiv="X-Content-Security-Policy')) {
      indexHtml = indexHtml.replace(
        '</head>',
        `
        <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
      />
      <meta
        http-equiv="X-Content-Security-Policy"
        content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
      />
      </head>`
      );
    }

    tree.write(indexHtmlPath, indexHtml);
  }
};

/**
 * Adjusts the PostCSS configuration for compatibility.
 *
 * Modifies the project's PostCSS configuration to ensure compatibility with Nx Electron and Vite.
 * This may involve adding or modifying plugins, setting options, or other adjustments specific to the project setup.
 *
 * @param tree - Access to the file system.
 * @param rootProject - Project configuration object, used to locate the PostCSS config file.
 */
export const fixTailwindsSetup = (
  rootProject: ProjectConfiguration,
  tree: Tree,
  options: InitGeneratorSchema
) => {
  const postcssFile = path.join(rootProject.root, 'postcss.config.js');
  if (!tree.exists(postcssFile)) {
    logger.warn(
      `🚨 IMPORTANT 🚨 If the project ever runs an @nx generator for tailwinds on ${options.hostProject}, make sure to rename postcss.config.js to postcss.config.cjs.`
    );
  } else {
    //rename postcss.config.js to postcss.config.cjs
    tree.rename(postcssFile, path.join(rootProject.root, 'postcss.config.cjs'));
    logger.info(
      `✅ Found taildwinds config. Renamed postcss.config.js to postcss.config.cjs`
    );
  }
};

/**
 * Configures Jest for the project.
 *
 * Updates the Jest setup file to ensure compatibility with the project's testing requirements.
 * This may include configuring global mocks, setting up test environments, or other Jest configurations necessary for the project.
 *
 * @param tree - Access to the file system.
 * @param rootProject - Project configuration object, used to locate and modify the Jest setup file.
 */
export const fixJestSetup = (
  rootProject: ProjectConfiguration,
  tree: Tree,
  options: InitGeneratorSchema
) => {
  const jestPresetFile = path.join(workspaceRoot, 'jest.preset.js');
  const jestProjectConfigFile = path.join(rootProject.root, 'jest.config.ts');

  //1. rename the preset on the workspace
  const jestPresetExists = tree.exists('jest.preset.js');
  if (!jestPresetExists) {
    logger.warn(
      `🚨 IMPORTANT 🚨 If the project ever configure jest tests for ${options.hostProject}, make sure to rename the workspace jest.preset.js to jest.preset.cjs.`
    );
  } else {
    tree.rename('jest.preset.js', 'jest.preset.cjs');
    logger.info(
      `✅ Found jest preset on workspace. Renamed jest.preset.js to jest.preset.cjs`
    );
    logger.warn(
      `If you have other projects using jest, make sure to reference the new jest.prese.cjs on those.`
    );
  }

  //2. replace any text that might contain jest.preset.js in the target project

  if (tree.exists(jestProjectConfigFile)) {
    let readContents = tree.read(jestProjectConfigFile).toString();
    readContents = readContents.replace('jest.preset.js', 'jest.preset.cjs');
    tree.write(jestProjectConfigFile, readContents);
    logger.info(
      `✅ Found jest.config.ts in project ${rootProject.name}. Replaced reference of jest.preset.js to jest.preset.cjs`
    );
  } else {
    logger.warn(
      `🚨 IMPORTANT 🚨 If the project ever configure jest tests for ${rootProject.name}, make sure to reference the workspace jest.preset.cjs in your jest.config.ts file.`
    );
  }

  // check if the current project contains
};

export const updateTargetProject = (
  tree: Tree,
  options: InitGeneratorSchema
) => {
  const projectJson = readProjectConfiguration(tree, options.hostProject);
  const { targets } = projectJson;

  targets['nx-electron-build'] = {
    cache: false,
    executor: '@erickrodrcodes/nx-electron-vite:build-electron',
    options: {
      hostProject: options.hostProject,
      hostProjectRoot: '{projectRoot}',
      mainOutputPath: `dist/apps/${options.hostProject}-electron`,
      mainOutputFilename: 'main.js',
      author: options.author,
      description: options.description,
    },
  };

  targets['nx-electron-icons'] = {
    cache: false,
    executor: '@erickrodrcodes/nx-electron-vite:build-icons',
    options: {
      hostProject: 'frontend',
      hostProjectRoot: '{projectRoot}',
      iconOutputPath: `dist/apps/${options.hostProject}-electron-icons`,
    },
  };

  updateProjectConfiguration(tree, options.hostProject, projectJson);
};

export default initGenerator;
