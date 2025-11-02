import { Tree, readProjectConfiguration } from '@nx/devkit';
import * as devkit from '@nx/devkit/src/generators/project-name-and-root-utils';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import * as path from 'path';
import { vi } from 'vitest';
import { SetupProjectSchema } from '../generators/setup-project/schema';
import {
  getProjectOutputDirectory,
  getRootTsConfigPath,
  normalizeOptions,
} from './utils';

// Helper function to normalize paths for cross-platform testing
const normalizePath = (p: string) => p.split(path.sep).join('/');

// Mock the external devkit functions
vi.mock('@nx/devkit', async () => {
  const actual = await vi.importActual('@nx/devkit');
  return {
    ...actual,
    getWorkspaceLayout: vi.fn().mockReturnValue({ appsDir: 'apps' }),
    readProjectConfiguration: vi.fn().mockReturnValue({
      targets: {
        build: {
          options: {
            outputPath: 'dist/apps/test-app',
          },
        },
      },
    }),
    offsetFromRoot: vi.fn().mockReturnValue('../'),
  };
});

vi.mock('@nx/devkit/src/generators/project-name-and-root-utils', () => ({
  determineProjectNameAndRootOptions: vi.fn(),
}));

// Mock our internal functions
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    getProjectOutputDirectory: vi.fn(),
    getRootTsConfigPath: vi.fn(),
  };
});

describe('utils', () => {
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

    // Mock readProjectConfiguration to return a basic project config
    (readProjectConfiguration as vi.mock).mockReturnValue({
      root: 'apps/foo',
      targets: {
        build: {
          options: {
            outputPath: 'dist/apps/foo',
          },
        },
      },
    });

    // Set up default mocks for each test
    (getProjectOutputDirectory as vi.mock).mockResolvedValue('dist/apps/foo');
    (getRootTsConfigPath as vi.mock).mockReturnValue('tsconfig.base.json');
  });

  describe('normalizeOptions - directory handling', () => {
    beforeEach(() => {
      vi.mocked(devkit.determineProjectNameAndRootOptions).mockImplementation(
        (tree, options) => {
          return Promise.resolve({
            projectName: options.name,
            projectRoot: `${options.directory}/${options.name}`,
            names: {
              projectFileName: options.name,
              projectSimpleName: options.name,
            },
            importPath: `@test/${options.name}`,
          });
        }
      );
    });

    it('should use workspace apps directory when no directory is specified', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'gato',
        name: 'Gato App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'gato',
        directory: '',
        nameProject: '',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      // Verify the mock was called with correct parameters
      expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
        tree,
        {
          name: 'gato-electron',
          projectType: 'application',
          directory: 'apps',
        }
      );

      expect(normalizePath(result.directory)).toBe('apps/gato-electron');
      expect(result.nameProject).toBe('gato-electron');
    });

    it('should use custom directory when specified', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'gato',
        name: 'Gato App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'gato',
        directory: 'casa',
        nameProject: '',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
        tree,
        {
          name: 'gato-electron',
          projectType: 'application',
          directory: 'casa',
        }
      );

      expect(normalizePath(result.directory)).toBe('casa/gato-electron');
      expect(result.nameProject).toBe('gato-electron');
    });

    it('should handle custom project name with workspace directory', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'gato',
        name: 'Gato App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'gato',
        directory: '',
        nameProject: 'mi-gato-electron',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
        tree,
        {
          name: 'mi-gato-electron',
          projectType: 'application',
          directory: 'apps',
        }
      );

      expect(normalizePath(result.directory)).toBe('apps/mi-gato-electron');
      expect(result.nameProject).toBe('mi-gato-electron');
    });

    it('should handle custom project name with custom directory', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'gato',
        name: 'Gato App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'gato',
        directory: 'casa',
        nameProject: 'mi-gato-electron',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
        tree,
        {
          name: 'mi-gato-electron',
          projectType: 'application',
          directory: 'casa',
        }
      );

      expect(normalizePath(result.directory)).toBe('casa/mi-gato-electron');
      expect(result.nameProject).toBe('mi-gato-electron');
    });
  });

  describe('normalizeOptions - nameProject handling', () => {
    let tree: Tree;
    const baseSchema: SetupProjectSchema = {
      guestProject: 'test-app',
      name: 'Test App',
      author: 'Test Author',
      description: 'Test Description',
      executableName: 'test-app',
      updater: true,
      nameProject: undefined,
      directory: undefined,
      testRunner: 'jest',
    };

    beforeEach(() => {
      tree = {
        exists: vi.fn().mockReturnValue(true),
        read: vi.fn().mockReturnValue('{}'),
      } as unknown as Tree;
      vi.clearAllMocks();
      vi.mocked(devkit.determineProjectNameAndRootOptions).mockImplementation(
        (tree, options) => {
          return Promise.resolve({
            projectName: options.name,
            projectRoot: `${options.directory}/${options.name}`,
            names: {
              projectFileName: options.name,
              projectSimpleName: options.name,
            },
            importPath: `@test/${options.name}`,
          });
        }
      );
    });

    it('should use guestProject-electron when nameProject is undefined', async () => {
      const schema = { ...baseSchema };
      const result = await normalizeOptions(tree, schema);
      expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
        tree,
        expect.objectContaining({
          name: 'test-app-electron',
          projectType: 'application',
          directory: 'apps',
        })
      );
      expect(result.nameProject).toBe('test-app-electron');
    });

    it('should use guestProject-electron when nameProject is null', async () => {
      const schema = { ...baseSchema, nameProject: null };
      const result = await normalizeOptions(tree, schema);
      expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
        tree,
        expect.objectContaining({
          name: 'test-app-electron',
          projectType: 'application',
          directory: 'apps',
        })
      );
      expect(result.nameProject).toBe('test-app-electron');
    });

    it('should use guestProject-electron when nameProject is empty string', async () => {
      const schema = { ...baseSchema, nameProject: '' };
      const result = await normalizeOptions(tree, schema);
      expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
        tree,
        expect.objectContaining({
          name: 'test-app-electron',
          projectType: 'application',
          directory: 'apps',
        })
      );
      expect(result.nameProject).toBe('test-app-electron');
    });

    it('should use guestProject-electron when nameProject is whitespace', async () => {
      const schema = { ...baseSchema, nameProject: '   ' };
      const result = await normalizeOptions(tree, schema);
      expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
        tree,
        expect.objectContaining({
          name: 'test-app-electron',
          projectType: 'application',
          directory: 'apps',
        })
      );
      expect(result.nameProject).toBe('test-app-electron');
    });

    it('should use provided nameProject when it is a valid string', async () => {
      const schema = { ...baseSchema, nameProject: 'custom-name' };
      const result = await normalizeOptions(tree, schema);
      expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
        tree,
        expect.objectContaining({
          name: 'custom-name',
          projectType: 'application',
          directory: 'apps',
        })
      );
      expect(result.nameProject).toBe('custom-name');
    });
  });

  describe('normalizeOptions - path construction', () => {
    beforeEach(() => {
      vi.mocked(devkit.determineProjectNameAndRootOptions).mockImplementation(
        (tree, options) => {
          return Promise.resolve({
            projectName: options.name,
            projectRoot: `${options.directory}/${options.name}`,
            names: {
              projectFileName: options.name,
              projectSimpleName: options.name,
            },
            importPath: `@test/${options.name}`,
          });
        }
      );
    });

    it('should construct all paths correctly with default directory', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'gato',
        name: 'Gato App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'gato',
        directory: '',
        nameProject: 'mi-gato-electron',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      // Verify all paths use forward slashes
      const pathProperties = [
        'directory',
        'directoryRoot',
        'directoryResources',
        'outputDistFolder',
        'outputDistFolderIcons',
        'nsisExtraFilePath',
      ];

      pathProperties.forEach((prop) => {
        const path = result[prop];
        expect(path).not.toContain('\\');
        expect(path).toEqual(normalizePath(path));
      });
    });

    it('should construct all paths correctly with custom directory', async () => {
      const options: SetupProjectSchema = {
        guestProject: 'gato',
        name: 'Gato App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'gato',
        directory: 'custom/path',
        nameProject: 'mi-gato-electron',
        updater: false,
        testRunner: 'none',
      };

      const result = await normalizeOptions(tree, options);

      // Verify all paths use forward slashes
      const pathProperties = [
        'directory',
        'directoryRoot',
        'directoryResources',
        'outputDistFolder',
        'outputDistFolderIcons',
        'nsisExtraFilePath',
      ];

      pathProperties.forEach((prop) => {
        const path = result[prop];
        expect(path).not.toContain('\\');
        expect(path).toEqual(normalizePath(path));
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should construct correct path when nameProject is empty', async () => {
    // Mock the determineProjectNameAndRootOptions to verify input and return expected output
    vi.mocked(devkit.determineProjectNameAndRootOptions).mockResolvedValue({
      projectName: 'foo-electron',
      projectRoot: 'apps/foo-electron',
    });

    const schema: SetupProjectSchema = {
      guestProject: 'foo',
      directory: 'apps',
      nameProject: '', // Empty nameProject
      name: 'Foo App',
      author: 'Test Author',
      description: 'Test Description',
      executableName: 'foo-app',
      updater: false,
      testRunner: 'none',
    };

    const result = await normalizeOptions(tree, schema);

    // Verify determineProjectNameAndRootOptions was called with correct parameters
    expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
      tree,
      {
        name: 'foo-electron',
        projectType: 'application',
        directory: 'apps',
      }
    );

    // Verify the resulting paths
    expect(normalizePath(result.directory)).toBe('apps/foo-electron');
    expect(normalizePath(result.directoryRoot)).toBe('apps/foo-electron/src');
    expect(result.nameProject).toBe('foo-electron');
  });

  it('should use provided nameProject when it exists', async () => {
    vi.mocked(devkit.determineProjectNameAndRootOptions).mockResolvedValue({
      projectName: 'custom-name',
      projectRoot: 'apps/custom-name',
    });

    const schema: SetupProjectSchema = {
      guestProject: 'foo',
      directory: 'apps',
      nameProject: 'custom-name',
      name: 'Foo App',
      author: 'Test Author',
      description: 'Test Description',
      executableName: 'foo-app',
      updater: false,
      testRunner: 'none',
    };

    const result = await normalizeOptions(tree, schema);

    expect(devkit.determineProjectNameAndRootOptions).toHaveBeenCalledWith(
      tree,
      {
        name: 'custom-name',
        projectType: 'application',
        directory: 'apps',
      }
    );

    expect(normalizePath(result.directory)).toBe('apps/custom-name');
    expect(normalizePath(result.directoryRoot)).toBe('apps/custom-name/src');
    expect(result.nameProject).toBe('custom-name');
  });
});
