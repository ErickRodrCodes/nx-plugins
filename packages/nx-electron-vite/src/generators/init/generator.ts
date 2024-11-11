import {
  addDependenciesToPackageJson,
  Tree,
  GeneratorCallback,
  removeDependenciesFromPackageJson,
  formatFiles,
  runTasksInSerial,
  installPackagesTask,
} from '@nx/devkit';
import {
  electronBuilderVersion,
  electronVersion,
  png2iconsVersion,
  vitePluginElectronRendererVersion,
  vitePluginElectronVersion,
} from '../../util/versions';
import { InitGeneratorSchema } from './schema';

export const dependencies: Record<string, string> = {};

export async function initGenerator(tree: Tree, schema: InitGeneratorSchema) {
  const tasks: GeneratorCallback[] = [];
  if (!schema.skipPackageJson) {
    tasks.push(
      removeDependenciesFromPackageJson(
        tree,
        [
          'electron-builder',
          'electron',
          'vite-plugin-electron-renderer',
          'vite-plugin-electron',
          'png2icons',
        ],
        []
      )
    );

    tasks.push(
      addDependenciesToPackageJson(
        tree,
        {},
        {
          'electron-builder': electronBuilderVersion,
          electron: electronVersion,
          'vite-plugin-electron-renderer': vitePluginElectronRendererVersion,
          'vite-plugin-electron': vitePluginElectronVersion,
          png2icons: png2iconsVersion,
        }
      )
    );
  }

  if (!schema.skipInstallPluginDependencies && !schema.skipPackageJson) {
    tasks.push(() => {
      installPackagesTask(tree, true);
    });
  }

  if (!schema.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(...tasks);
}

export default initGenerator;
