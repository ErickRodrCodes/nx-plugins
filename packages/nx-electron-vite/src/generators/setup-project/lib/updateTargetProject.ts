import { Tree, readProjectConfiguration, updateProjectConfiguration } from "@nx/devkit";
import { InitGeneratorSchema } from "../schema";


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
