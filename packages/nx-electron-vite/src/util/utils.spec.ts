import { Tree, readProjectConfiguration } from '@nx/devkit';
import * as devkit from '@nx/devkit/src/generators/project-name-and-root-utils';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { SetupProjectSchema } from '../generators/setup-project/schema';
import {
  getProjectOutputDirectory,
  getRootTsConfigPath,
  normalizeOptions,
} from './utils';

// Mock the external devkit functions
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  readProjectConfiguration: jest.fn(),
}));

jest.mock('@nx/devkit/src/generators/project-name-and-root-utils', () => ({
  determineProjectNameAndRootOptions: jest.fn(),
}));

// Mock our internal functions
jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    getProjectOutputDirectory: jest.fn(),
    getRootTsConfigPath: jest.fn(),
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
    (readProjectConfiguration as jest.Mock).mockReturnValue({
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
    (getProjectOutputDirectory as jest.Mock).mockResolvedValue('dist/apps/foo');
    (getRootTsConfigPath as jest.Mock).mockReturnValue('tsconfig.base.json');
  });

  describe('normalizeOptions', () => {
    beforeEach(() => {
      // Reset the mock before each test
      (devkit.determineProjectNameAndRootOptions as jest.Mock).mockReset();
    });

    it('should use workspace apps directory when no directory is specified', async () => {
      // Setup mock to return expected project structure
      (
        devkit.determineProjectNameAndRootOptions as jest.Mock
      ).mockResolvedValue({
        projectName: 'gato-electron',
        projectRoot: 'apps/gato-electron',
      });

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

      expect(result.directory).toBe('apps/gato-electron');
      expect(result.nameProject).toBe('gato-electron');
    });

    it('should use custom directory when specified', async () => {
      // Setup mock for custom directory
      (
        devkit.determineProjectNameAndRootOptions as jest.Mock
      ).mockResolvedValue({
        projectName: 'gato-electron',
        projectRoot: 'casa/gato-electron',
      });

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

      expect(result.directory).toBe('casa/gato-electron');
      expect(result.nameProject).toBe('gato-electron');
    });

    it('should handle custom project name with workspace directory', async () => {
      // Setup mock for custom project name
      (
        devkit.determineProjectNameAndRootOptions as jest.Mock
      ).mockResolvedValue({
        projectName: 'mi-gato-electron',
        projectRoot: 'apps/mi-gato-electron',
      });

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

      expect(result.directory).toBe('apps/mi-gato-electron');
      expect(result.nameProject).toBe('mi-gato-electron');
    });

    it('should handle custom project name with custom directory', async () => {
      // Setup mock for custom name and directory
      (
        devkit.determineProjectNameAndRootOptions as jest.Mock
      ).mockResolvedValue({
        projectName: 'mi-gato-electron',
        projectRoot: 'casa/mi-gato-electron',
      });

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

      expect(result.directory).toBe('casa/mi-gato-electron');
      expect(result.nameProject).toBe('mi-gato-electron');
    });

    it('should handle directory with trailing spaces', async () => {
      // Setup mock for directory with spaces
      (
        devkit.determineProjectNameAndRootOptions as jest.Mock
      ).mockResolvedValue({
        projectName: 'gato-electron',
        projectRoot: 'casa/gato-electron',
      });

      const options: SetupProjectSchema = {
        guestProject: 'gato',
        name: 'Gato App',
        author: 'Test Author',
        description: 'Test Description',
        executableName: 'gato',
        directory: 'casa  ',
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

      expect(result.directory).toBe('casa/gato-electron');
      expect(result.nameProject).toBe('gato-electron');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should construct correct path when nameProject is empty', async () => {
    // Mock the determineProjectNameAndRootOptions to verify input and return expected output
    (devkit.determineProjectNameAndRootOptions as jest.Mock).mockResolvedValue({
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
    expect(result.directory).toBe('apps/foo-electron');
    expect(result.directoryRoot).toBe('apps/foo-electron/src');
    expect(result.nameProject).toBe('foo-electron');
  });

  it('should use provided nameProject when it exists', async () => {
    (devkit.determineProjectNameAndRootOptions as jest.Mock).mockResolvedValue({
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

    expect(result.directory).toBe('apps/custom-name');
    expect(result.directoryRoot).toBe('apps/custom-name/src');
    expect(result.nameProject).toBe('custom-name');
  });
});
