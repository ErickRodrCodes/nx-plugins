import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SetupProjectSchema } from '../generators/setup-project/schema';
import {
  findNodeFile,
  isRebuiltNativeAddonPath,
  normalizeOptions,
  withNpmConfigForceBuild,
} from './utils';

// Helper function to normalize paths for cross-platform testing
const normalizePath = (p: string) => p.split(path.sep).join('/');

describe('normalizeOptions', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();

    // Setup a mock nx.json with default workspace layout
    tree.write(
      'nx.json',
      JSON.stringify({
        workspaceLayout: {
          appsDir: 'apps',
          libsDir: 'packages',
        },
      }),
    );

    // Create a mock guest project that normalizeOptions will look up
    tree.write(
      'apps/test-app/project.json',
      JSON.stringify({
        name: 'test-app',
        root: 'apps/test-app',
        targets: {
          build: {
            options: {
              outputPath: 'dist/apps/test-app',
            },
          },
        },
      }),
    );
  });

  describe('directory handling', () => {
    it('should use workspace apps directory when no directory is specified', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'test-app',
        name: 'Test App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'test-app',
        directory: '',
        nameProject: '',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      expect(normalizePath(result.directory)).toContain('apps');
    });

    it('should include electron in the derived project name when directory is default', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'test-app',
        name: 'Test App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'test-app',
        directory: '',
        nameProject: '',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      expect(result.nameProject).toContain('electron');
    });

    it('should use custom directory when specified', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'test-app',
        name: 'Test App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'test-app',
        directory: 'custom-dir',
        nameProject: '',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      expect(normalizePath(result.directory)).toContain('custom-dir');
    });
  });

  describe('nameProject handling', () => {
    it('should derive nameProject from guestProject when nameProject is empty', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'test-app',
        name: 'Test App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'test-app',
        directory: '',
        nameProject: '',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      // Should derive name from guestProject + '-electron'
      expect(result.nameProject).toBe('test-app-electron');
    });

    it('should use provided nameProject when specified', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'test-app',
        name: 'Test App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'test-app',
        directory: '',
        nameProject: 'my-custom-electron-app',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      expect(result.nameProject).toBe('my-custom-electron-app');
    });

    it('should treat whitespace-only nameProject as empty', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'test-app',
        name: 'Test App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'test-app',
        directory: '',
        nameProject: '   ',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      // Should derive name from guestProject when nameProject is whitespace
      expect(result.nameProject).toBe('test-app-electron');
    });
  });

  describe('path construction', () => {
    it('should construct all paths with forward slashes', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'test-app',
        name: 'Test App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'test-app',
        directory: '',
        nameProject: '',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      const pathProperties = [
        'directory',
        'directoryRoot',
        'directoryResources',
        'outputDistFolder',
        'outputDistFolderIcons',
        'nsisExtraFilePath',
      ];

      expect(
        pathProperties.every((prop) => {
          const pathValue = result[prop];
          return (
            !String(pathValue).includes('\\') &&
            pathValue === normalizePath(pathValue)
          );
        }),
      ).toBe(true);
    });

    it('should set directoryRoot as directory/src', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'test-app',
        name: 'Test App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'test-app',
        directory: '',
        nameProject: '',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      expect(normalizePath(result.directoryRoot)).toBe(
        `${normalizePath(result.directory)}/src`,
      );
    });

    it('should set directoryResources as directory/resources', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'test-app',
        name: 'Test App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'test-app',
        directory: '',
        nameProject: '',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      expect(normalizePath(result.directoryResources)).toBe(
        `${normalizePath(result.directoryRoot)}/resources`,
      );
    });
  });

  describe('schema passthrough', () => {
    it('should preserve name, author, and description from schema', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'test-app',
        name: 'My Electron App',
        author: 'John Doe',
        description: 'An awesome electron app',
        executableName: 'my-app',
        directory: '',
        nameProject: '',
        updater: true,
        testRunner: 'vitest',
      };

      const result = await normalizeOptions(tree, options);

      expect({
        name: result.name,
        author: result.author,
        description: result.description,
        executableName: result.executableName,
        updater: result.updater,
        testRunner: result.testRunner,
      }).toEqual({
        name: 'My Electron App',
        author: 'John Doe',
        description: 'An awesome electron app',
        executableName: 'my-app',
        updater: true,
        testRunner: 'vitest',
      });
    });
  });
});

describe('isRebuiltNativeAddonPath', () => {
  it('accepts Electron rebuild output under build/Release', () => {
    expect(
      isRebuiltNativeAddonPath(
        '/ws/node_modules/better-sqlite3/build/Release/better_sqlite3.node',
      ),
    ).toBe(true);
  });

  it('accepts Electron rebuild output under build/Debug with Windows separators', () => {
    expect(
      isRebuiltNativeAddonPath(
        'C:\\ws\\node_modules\\better-sqlite3\\build\\Debug\\better_sqlite3.node',
      ),
    ).toBe(true);
  });

  it('rejects a win32 npm prebuild path', () => {
    expect(
      isRebuiltNativeAddonPath(
        '/ws/node_modules/better-sqlite3/prebuilds/win32-x64.node',
      ),
    ).toBe(false);
  });

  it('rejects a darwin npm prebuild path', () => {
    expect(
      isRebuiltNativeAddonPath(
        '/ws/node_modules/better-sqlite3/prebuilds/darwin-arm64.node',
      ),
    ).toBe(false);
  });
});

describe('withNpmConfigForceBuild', () => {
  const envKey = 'npm_config_force_build';

  afterEach(() => {
    delete process.env[envKey];
  });

  it('sets npm_config_force_build=1 during the callback', async () => {
    delete process.env[envKey];
    let seen: string | undefined;
    await withNpmConfigForceBuild(async () => {
      seen = process.env[envKey];
    });
    expect(seen).toBe('1');
  });

  it('restores a previous value after success', async () => {
    process.env[envKey] = '0';
    let during: string | undefined;
    await withNpmConfigForceBuild(async () => {
      during = process.env[envKey];
    });
    expect({ during, after: process.env[envKey] }).toEqual({
      during: '1',
      after: '0',
    });
  });

  it('clears the env var if it was unset, even when the callback throws', async () => {
    delete process.env[envKey];
    await withNpmConfigForceBuild(async () => {
      throw new Error('rebuild failed');
    }).catch(() => undefined);
    expect(process.env[envKey]).toBeUndefined();
  });

  it('re-throws the callback error', async () => {
    await expect(
      withNpmConfigForceBuild(async () => {
        throw new Error('rebuild failed');
      }),
    ).rejects.toThrow('rebuild failed');
  });
});

describe('findNodeFile', () => {
  let fixtureRoot: string;

  function writeNode(relativePath: string): string {
    const abs = path.join(fixtureRoot, relativePath);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, 'fake-native');
    return abs;
  }

  beforeEach(() => {
    fixtureRoot = mkdtempSync(path.join(tmpdir(), 'nx-electron-native-'));
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('prefers build/Release/better_sqlite3.node over foreign and test_extension addons', async () => {
    writeNode(path.join('prebuilds', 'darwin-arm64.node'));
    writeNode(path.join('prebuilds', 'win32-x64.node'));
    writeNode(path.join('build', 'Release', 'test_extension.node'));
    const release = writeNode(
      path.join('build', 'Release', 'better_sqlite3.node'),
    );

    const found = await findNodeFile(fixtureRoot);
    expect(found).toBe(release);
  });

  it('falls back to build/Debug when Release is empty', async () => {
    const debug = writeNode(path.join('build', 'Debug', 'addon.node'));
    writeNode(path.join('prebuilds', 'darwin-arm64.node'));

    const found = await findNodeFile(fixtureRoot);
    expect(found).toBe(debug);
  });

  it('uses a platform-matching prebuild only when no rebuild output exists', async () => {
    const platformPrebuild = writeNode(
      path.join('prebuilds', `${process.platform}-${process.arch}.node`),
    );
    writeNode(path.join('prebuilds', 'darwin-arm64.node'));
    writeNode(path.join('prebuilds', 'linux-x64.node'));

    const found = await findNodeFile(fixtureRoot);
    expect(found).toBe(platformPrebuild);
  });

  it('refuses to return only a foreign prebuild (no rebuild output)', async () => {
    const foreign =
      process.platform === 'darwin' ? 'win32-x64.node' : 'darwin-arm64.node';
    writeNode(path.join('prebuilds', foreign));

    const found = await findNodeFile(fixtureRoot);
    expect(found).toBeNull();
  });
});
