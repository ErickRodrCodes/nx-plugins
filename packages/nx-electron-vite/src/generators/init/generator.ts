import {
  addDependenciesToPackageJson,
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
  installPackagesTask,
} from '@nx/devkit';
import * as path from 'node:path';
import { InitGeneratorSchema } from './schema';
import { compareNodeVersion } from '../../util/utils';
import { injectViteConfig } from '../../util/injectViteConfig';

export const devDependencies: Record<string, string> = {
  'electron-builder': '^24.13.3',
  electron: '^30.0.2',
  'vite-plugin-electron-renderer': '^0.14.5',
  'vite-plugin-electron': '^0.28.6',
  png2icons: '^2.0.1',
};

export const dependencies: Record<string, string> = {};

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

  const suggestedNodeVersion = 'v18.18.0';
  const currentVersion = process.version;

  if (!rootProject) {
    throw new Error(`Could not find project with name ${options.hostProject}`);
  } else if (rootProject.projectType !== 'application') {
    throw new Error(
      `The Host Project with name ${options.hostProject} is not an application project. Please provide the name of an application project.`
    );
  }
  // Todo: check that the vite project contain at least a Nx frontend plugin that uses vite

  //check if vite.config.ts is in the root of the project
  const viteConfigPath = path.join(rootProject.root, 'vite.config.ts');
  if (!tree.exists(viteConfigPath)) {
    throw new Error(
      `Could not find vite.config.ts in the root of the project ${options.hostProject}`
    );
  }

  if (compareNodeVersion(currentVersion, suggestedNodeVersion) === -1) {
    throw new Error(
      `Your current node version ${currentVersion} is lower than the suggested version ${suggestedNodeVersion}. Please update your node version to ${suggestedNodeVersion} or higher.`
    );
  }

  if (!Object.keys(packageJson.contents).includes('type')) {
    packageJson.contents.type = 'module';
    writeJson(tree, 'package.json', packageJson.contents);
  } else if (packageJson.contents.type !== 'module') {
    throw new Error(
      `Workspace package.json contains a type that is "${packageJson.contents.type}". Note that type "module" this is required for nx-electron-vite to work properly.`
    );
  }

  // read the project's vite config and add a new target for electron to build, which
  // requires to build first the vite project and then the electron project
  const contents = tree.read(viteConfigPath)?.toString() || '';
  if (contents.includes('electronNxViteConfig')) {
    throw new Error(
      `The project "${options.hostProject}" already contains an Nx Electron Vite implementation. Aborting.`
    );
  }

  // check if the html file of the project contains '<base href="/" />' and remove it
  // as it might cause the electron app to not load properly assets
  const indexHtmlPath = path.join(rootProject.root, 'index.html');
  if (tree.exists(indexHtmlPath)) {
    const indexHtml = tree.read(indexHtmlPath)?.toString();
    if (indexHtml.includes('<base href="/" />')) {
      tree.write(indexHtmlPath, indexHtml.replace('<base href="/" />', ''));
    }
  }

  tree.write(viteConfigPath, injectViteConfig(viteConfigPath, tree));

  //check if application is using nx-electron-vite in the project configuration

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

  generateFiles(tree, path.join(__dirname, 'files'), rootProject.root, {
    ...options,
    ...extraParams,
  });

  tasks.push(addDependenciesToPackageJson(tree, dependencies, devDependencies));

  const runInstallPackageTasks = () => {
    installPackagesTask(tree,true);
  }

  tasks.push(runInstallPackageTasks);

  return runTasksInSerial(...tasks);

}

export async function initGenerator(tree: Tree, schema: InitGeneratorSchema) {
  const installTask = updateDependencies(tree, schema);
  await formatFiles(tree);
  return installTask;
}

export default initGenerator;
