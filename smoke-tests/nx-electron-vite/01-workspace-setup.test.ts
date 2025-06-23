import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { smokeTestsTmpDir, workspaceGenerator } from '../shared/setup';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('01: Workspace Setup and Plugin Installation', () => {
  it('should have created the plugin tar.gz in smoke-tests/tmp', () => {
    const tarGzPath = join(smokeTestsTmpDir, 'nx-electron-vite.tar.gz');
    expect(existsSync(tarGzPath)).toBe(true);
  });

  it('should have created the workspace successfully', () => {
    const workspacePath = workspaceGenerator!.getWorkspacePath();
    expect(existsSync(workspacePath)).toBe(true);

    // Check for essential workspace files
    const packageJsonPath = join(workspacePath, 'package.json');
    const nxJsonPath = join(workspacePath, 'nx.json');
    expect(existsSync(packageJsonPath)).toBe(true);
    expect(existsSync(nxJsonPath)).toBe(true);
  });

  it('should have copied tar.gz to workspace', () => {
    // Copy the tar.gz file to the workspace
    workspaceGenerator!.copyPluginTarGz();

    const workspacePath = workspaceGenerator!.getWorkspacePath();
    const workspaceTarGzPath = join(workspacePath, 'nx-electron-vite.tar.gz');
    expect(existsSync(workspaceTarGzPath)).toBe(true);
  });

  it('should have plugin installed as dev dependency', () => {
    // Add the plugin as dev dependency
    workspaceGenerator!.addPluginAsDevDependency();

    // Verify the plugin is in package.json devDependencies
    const packageJson = workspaceGenerator!.readJsonFile('package.json');
    expect(packageJson.devDependencies).toBeDefined();
    expect(packageJson.devDependencies['@erickrodrcodes/nx-electron-vite']).toBe('file:./nx-electron-vite.tar.gz');
  });

  // it('should have React guest app properly configured', () => {
  //   ...
  // });

  it('should be able to run nx g @erickrodrcodes/nx-electron-vite:init', () => {
    // Run the init generator
    workspaceGenerator!.execCommand('pnpm nx g @erickrodrcodes/nx-electron-vite:init');

    // Verify the plugin is registered in nx.json
    const nxJson = workspaceGenerator!.readJsonFile('nx.json');
    const pluginEntry = (nxJson.plugins || []).find((plugin: any) => plugin.plugin === '@nx/vite/plugin');
    expect(pluginEntry).toBeDefined();
  });

  it('should have correct initial dependencies after init', () => {
    // Import versions from the generated JSON file
    const versionLibraries = require('../../packages/nx-electron-vite/src/util/versions.json');

    // Verify that the required Electron dependencies are installed
    const packageJson = workspaceGenerator!.readJsonFile('package.json');

    // Check that the plugin is still in devDependencies
    expect(packageJson.devDependencies['@erickrodrcodes/nx-electron-vite']).toBe('file:./nx-electron-vite.tar.gz');

    // Check that Electron dependencies are installed with correct versions
    expect(packageJson.devDependencies['electron']).toBe(versionLibraries.electron);
    expect(packageJson.devDependencies['electron-builder']).toBe(versionLibraries.electronBuilder);
    expect(packageJson.devDependencies['vite-plugin-electron']).toBe(versionLibraries.vitePluginElectron);
    expect(packageJson.devDependencies['vite-plugin-electron-renderer']).toBe(versionLibraries.vitePluginElectronRenderer);
    expect(packageJson.devDependencies['@electron/rebuild']).toBe(versionLibraries.electronRebuild);
    expect(packageJson.devDependencies['electron-is-dev']).toBe(versionLibraries.electronIsDev);
    expect(packageJson.devDependencies['png2icons']).toBe(versionLibraries.png2icons);
    expect(packageJson.devDependencies['wait-on']).toBe(versionLibraries.waitOn);
  });
});
