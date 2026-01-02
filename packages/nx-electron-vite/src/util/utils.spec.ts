import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import * as path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import { SetupProjectSchema } from '../generators/setup-project/schema';
import { normalizeOptions } from './utils';

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
      })
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
      })
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

      // Should default to 'apps' directory from workspace layout and include project name
      expect(normalizePath(result.directory)).toContain('apps');
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

      // Verify key paths use forward slashes (cross-platform compatibility)
      const pathProperties = [
        'directory',
        'directoryRoot',
        'directoryResources',
        'outputDistFolder',
        'outputDistFolderIcons',
        'nsisExtraFilePath',
      ];

      pathProperties.forEach((prop) => {
        const pathValue = result[prop];
        expect(pathValue).not.toContain('\\');
        expect(pathValue).toEqual(normalizePath(pathValue));
      });
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
        `${normalizePath(result.directory)}/src`
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
        `${normalizePath(result.directoryRoot)}/resources`
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
        testRunner: 'jest',
      };

      const result = await normalizeOptions(tree, options);

      expect(result.name).toBe('My Electron App');
      expect(result.author).toBe('John Doe');
      expect(result.description).toBe('An awesome electron app');
      expect(result.executableName).toBe('my-app');
      expect(result.updater).toBe(true);
      expect(result.testRunner).toBe('jest');
    });
  });
});
