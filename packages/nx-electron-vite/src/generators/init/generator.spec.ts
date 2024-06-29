import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  ProjectConfiguration,
  Tree,
  addProjectConfiguration,
  generateFiles,
  updateProjectConfiguration,
} from '@nx/devkit';
import * as fs from 'fs';

import { initGenerator } from './generator';
import { InitGeneratorSchema } from './schema';
import * as path from 'path';

import { devDependencies } from './generator';

const mockViteConfig = fs.readFileSync(
  path.join(__dirname, 'mocks', 'vite.config.mock'),
  'utf-8'
);
const mockViteConfigImplemented = fs.readFileSync(
  path.join(__dirname, 'mocks', 'vite.config.implemented.mock'),
  'utf-8'
);
const originalProcessVersion = process.version;

describe('nx-electron-vite generator', () => {
  let tree: Tree;
  const options: InitGeneratorSchema = {
    hostProject: 'example',
    executableName: 'example',
    name: 'example',
  };
  let projectConfiguration: ProjectConfiguration;
  beforeEach(() => {
    projectConfiguration = {
      root: 'apps/example',
      projectType: 'application',
      sourceRoot: 'apps/example/src',
      targets: {},
    };
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'example', projectConfiguration);
    generateFiles(
      tree,
      path.join(__dirname, 'files'),
      projectConfiguration.root,
      options
    );
    updateProjectConfiguration(tree, 'example', projectConfiguration);
  });

  afterEach(() => {
    Object.defineProperty(process, 'version', {
      writable: true,
      configurable: true,
      value: originalProcessVersion,
    });
  });

  it('Should throw an error if the host project is not an application', async () => {
    tree = createTreeWithEmptyWorkspace();
    projectConfiguration.root = 'libs/example';
    projectConfiguration.projectType = 'library';
    projectConfiguration.sourceRoot = 'libs/example/src';
    projectConfiguration.targets = {};

    addProjectConfiguration(tree, 'example', projectConfiguration);
    updateProjectConfiguration(tree, 'example', projectConfiguration);
    await expect(initGenerator(tree, options)).rejects.toThrow(
      `The Host Project with name example is not an application project. Please provide the name of an application project.`
    );
  });
  it('Should throw an error if the host project is not does not have a vite.config.ts file', async () => {
    tree.delete('apps/example/vite.config.ts');
    updateProjectConfiguration(tree, 'example', projectConfiguration);
    await expect(initGenerator(tree, options)).rejects.toThrow(
      `Could not find vite.config.ts in the root of the project example`
    );
  });
  it('Should throw an error if the workspace package.json type property is not "module"', async () => {
    // get the wokspace package.json
    const packageJsonContent = tree.read('package.json');
    const packageJson = packageJsonContent
      ? JSON.parse(packageJsonContent.toString())
      : {};
    packageJson.type = 'commonjs';
    tree.write('apps/example/vite.config.ts', mockViteConfig);
    tree.write('package.json', JSON.stringify(packageJson));
    generateFiles(
      tree,
      path.join(__dirname, 'files'),
      projectConfiguration.root,
      options
    );
    updateProjectConfiguration(tree, 'example', projectConfiguration);
    await expect(initGenerator(tree, options)).rejects.toThrow(
      `Workspace package.json contains a type that is "commonjs". Note that type "module" this is required for nx-electron-vite to work properly.`
    );
  });
  it('Should add the required devDependencies to the workspace package.json', async () => {
    tree.write('apps/example/vite.config.ts', mockViteConfig);
    generateFiles(
      tree,
      path.join(__dirname, 'files'),
      projectConfiguration.root,
      options
    );
    updateProjectConfiguration(tree, 'example', projectConfiguration);
    await initGenerator(tree, options);
    const packageJsonContent = tree.read('package.json');
    const packageJson = packageJsonContent
      ? JSON.parse(packageJsonContent.toString())
      : {};
    const generatedDevDependencies = packageJson.devDependencies;
    expect(generatedDevDependencies).toEqual(devDependencies);
  });

  it('Should inject the vite config with the electron plugin', async () => {
    tree.write('apps/example/vite.config.ts', mockViteConfig);
    generateFiles(
      tree,
      path.join(__dirname, 'files'),
      projectConfiguration.root,
      options
    );
    updateProjectConfiguration(tree, 'example', projectConfiguration);
    await initGenerator(tree, options);
    const viteConfigContent = tree.read('apps/example/vite.config.ts')?.toString() || '';
    expect(viteConfigContent).toContain(
      `electronNxViteConfig(),`
    );
  });
  it('Should have all the required files in the application', async () => {
    // Check if the files are generated
    tree.write('apps/example/vite.config.ts', mockViteConfig);
    generateFiles(
      tree,
      path.join(__dirname, 'files'),
      projectConfiguration.root,
      options
    );
    updateProjectConfiguration(tree, 'example', projectConfiguration);
    await initGenerator(tree, options);
    const expectedFiles = [
      'apps/example/electron-nx-vite.config.ts',
      'apps/example/electron/dev-app-update.yml',
      'apps/example/electron/electron-builder.yml',
      'apps/example/electron/main/electron-env.d.ts',
      'apps/example/electron/preload/preload.ts',
      'apps/example/electron-nx-vite.config.ts',
      'apps/example/package.json',
      'apps/example/vite.config.ts'
    ];

    expectedFiles.forEach((change) => {
      expect(tree.read(change)?.toString()).toBeTruthy();
    });
  });
  it('Should warn the user than an nx-electron-vite implementation already exists in the selected project',async () => {
    tree.write('apps/example/vite.config.ts', mockViteConfigImplemented);
    generateFiles(
      tree,
      path.join(__dirname, 'files'),
      projectConfiguration.root,
      options
    );
    updateProjectConfiguration(tree, 'example', projectConfiguration);
    await expect(initGenerator(tree, options)).rejects.toThrow(
      `The project "example" already contains an Nx Electron Vite implementation. Aborting.`
    );
  });
  it.todo('should build the electron application along with the host application');
  it.todo('Should throw an warning if the host project is not @nx/react, or @nx/vue');
});
