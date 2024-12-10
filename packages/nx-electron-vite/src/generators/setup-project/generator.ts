import {
  formatFiles,
  generateFiles,
  Tree,
  readJson,
  getProjects,
  GeneratorCallback,
  runTasksInSerial,
} from '@nx/devkit';
import * as path from 'node:path';
import { InitGeneratorSchema } from './schema';
import { injectViteConfig } from '../../util/injectViteConfig';
import { suggestedNodeVersion } from '../../util/versions';
import { checkNodeVersion, checkNxElectronViteConfig, checkPackageJsonType, checkRootProject, checkViteConfig, fixJestSetup, fixTailwindsSetup, parseHeaderHtmlForElectronApp, updateTargetProject } from './lib';

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

export default initGenerator;
