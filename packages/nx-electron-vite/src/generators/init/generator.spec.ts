import { readJson, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { initGenerator } from './generator';

describe('init', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should add the needed dependencies dependencies', async () => {
    await initGenerator(tree, {
      skipFormat: true,
      installPluginDependencies: false,
    });
    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.devDependencies['electron-builder']).toBeDefined();
    expect(packageJson.devDependencies['electron']).toBeDefined();
    expect(
      packageJson.devDependencies['vite-plugin-electron-renderer']
    ).toBeDefined();
    expect(packageJson.devDependencies['vite-plugin-electron']).toBeDefined();
    expect(packageJson.devDependencies['png2icons']).toBeDefined();
  });
});
