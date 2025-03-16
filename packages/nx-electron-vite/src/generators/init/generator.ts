import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  installPackagesTask,
  NX_VERSION,
  readJson,
  removeDependenciesFromPackageJson,
  runTasksInSerial,
  Tree,
  writeJson,
} from '@nx/devkit';
import { initGenerator as initVite } from '@nx/vite';
import { devDependencies, versionLibraries } from '../../util/versions';
import { initSchema } from './schema';

function ensureVitePlugin(tree: Tree) {
  const nxJson = readJson(tree, 'nx.json');

  // Initialize plugins array if it doesn't exist
  if (!nxJson.plugins) {
    nxJson.plugins = [];
  }

  // Check if Vite plugin already exists
  const vitePluginExists = nxJson.plugins.some(
    (plugin) => plugin.plugin === '@nx/vite/plugin'
  );

  // Add Vite plugin if it doesn't exist
  if (!vitePluginExists) {
    nxJson.plugins.push({
      plugin: '@nx/vite/plugin',
      options: {
        buildTargetName: 'build',
        testTargetName: 'test',
        serveTargetName: 'serve',
        previewTargetName: 'preview',
        serveStaticTargetName: 'serve-static',
      },
    });

    writeJson(tree, 'nx.json', nxJson);
  }
}

export async function initGenerator(tree: Tree, schema: initSchema) {
  const tasks: GeneratorCallback[] = [];

  // Initialize Vite first
  const viteInitTask = await initVite(tree, { skipFormat: true });
  tasks.push(viteInitTask);

  // Ensure Vite plugin is configured
  ensureVitePlugin(tree);

  if (!schema.skipPackageJson) {
    // Remove existing dependencies to ensure clean state
    tasks.push(removeDependenciesFromPackageJson(tree, [], devDependencies));

    // Add all required dependencies
    tasks.push(
      addDependenciesToPackageJson(
        tree,
        {}, // No runtime dependencies
        {
          '@nx/vite': NX_VERSION,
          'electron-builder': versionLibraries.electronBuilder,
          '@electron/rebuild': versionLibraries.electronRebuild,
          electron: versionLibraries.electron,
          'vite-plugin-electron-renderer':
            versionLibraries.vitePluginElectronRenderer,
          'vite-plugin-electron': versionLibraries.vitePluginElectron,
          png2icons: versionLibraries.png2icons,
          'wait-on': versionLibraries.waitOn,
          vitest: versionLibraries.vitest,
          'electron-is-dev': versionLibraries.electronIsDev,
        }
      )
    );

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
