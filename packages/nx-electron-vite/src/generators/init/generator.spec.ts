import * as devkit from '@nx/devkit';
import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import * as vitePlugin from '@nx/vite';
import { vi } from 'vitest';
import initGenerator from './generator';

vi.mock('@nx/vite', () => ({
  initGenerator: vi.fn().mockResolvedValue(() => Promise.resolve()),
}));

describe('initGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    vi.clearAllMocks();
  });

  describe('Vite initialization', () => {
    it('should call Vite init generator', async () => {
      await initGenerator(tree, { skipFormat: true });
      expect(vitePlugin.initGenerator).toHaveBeenCalledWith(tree, {
        skipFormat: true,
      });
    });

    it('should add Vite plugin to nx.json if not present', async () => {
      // Create nx.json without plugins
      const nxJson = {
        npmScope: 'test',
        plugins: [],
      };
      tree.write('nx.json', JSON.stringify(nxJson, null, 2));

      await initGenerator(tree, { skipFormat: true });

      const updatedNxJson = JSON.parse(tree.read('nx.json', 'utf-8'));
      expect(updatedNxJson.plugins).toContainEqual({
        plugin: '@nx/vite/plugin',
        options: {
          buildTargetName: 'build',
          testTargetName: 'test',
          serveTargetName: 'serve',
          previewTargetName: 'preview',
          serveStaticTargetName: 'serve-static',
        },
      });
    });

    it('should not duplicate Vite plugin if already present', async () => {
      // Create nx.json with Vite plugin
      const nxJson = {
        npmScope: 'test',
        plugins: [
          {
            plugin: '@nx/vite/plugin',
            options: {
              buildTargetName: 'build',
              testTargetName: 'test',
              serveTargetName: 'serve',
              previewTargetName: 'preview',
              serveStaticTargetName: 'serve-static',
            },
          },
        ],
      };
      tree.write('nx.json', JSON.stringify(nxJson, null, 2));

      await initGenerator(tree, { skipFormat: true });

      const updatedNxJson = JSON.parse(tree.read('nx.json', 'utf-8'));
      const vitePlugins = updatedNxJson.plugins.filter(
        (plugin) => plugin.plugin === '@nx/vite/plugin'
      );
      expect(vitePlugins).toHaveLength(1);
    });
  });

  describe('dependency management', () => {
    it('should add required dependencies when skipPackageJson is false', async () => {
      const addDependenciesSpy = vi.spyOn(
        devkit,
        'addDependenciesToPackageJson'
      );

      await initGenerator(tree, {
        skipPackageJson: false,
        skipFormat: true,
      });

      expect(addDependenciesSpy).toHaveBeenCalledWith(
        tree,
        {}, // No runtime dependencies
        expect.objectContaining({
          '@nx/vite': devkit.NX_VERSION,
          electron: expect.any(String),
          'electron-builder': expect.any(String),
          '@electron/rebuild': expect.any(String),
          'vite-plugin-electron': expect.any(String),
          'vite-plugin-electron-renderer': expect.any(String),
          png2icons: expect.any(String),
          'wait-on': expect.any(String),
          vitest: expect.any(String),
          'electron-is-dev': expect.any(String),
          'electron-log': expect.any(String),
        })
      );
    });

    it('should not modify dependencies when skipPackageJson is true', async () => {
      const addDependenciesSpy = vi.spyOn(
        devkit,
        'addDependenciesToPackageJson'
      );

      await initGenerator(tree, {
        skipPackageJson: true,
        skipFormat: true,
      });

      expect(addDependenciesSpy).not.toHaveBeenCalled();
    });
  });

  describe('formatFiles behavior', () => {
    it('should call formatFiles when skipFormat is false', async () => {
      const formatSpy = vi.spyOn(devkit, 'formatFiles');

      await initGenerator(tree, {
        skipPackageJson: true,
        skipFormat: false,
      });

      expect(formatSpy).toHaveBeenCalled();
    });

    it('should not call formatFiles when skipFormat is true', async () => {
      const formatSpy = vi.spyOn(devkit, 'formatFiles');

      await initGenerator(tree, {
        skipPackageJson: true,
        skipFormat: true,
      });

      expect(formatSpy).not.toHaveBeenCalled();
    });
  });
});
