import { vi, type Mock } from 'vitest';

vi.mock('../../util/utils', () => ({
  rebuildNativeModules: vi.fn(),
}));

vi.mock('@nx/devkit', async () => {
  const actual = await vi.importActual('@nx/devkit');
  return {
    ...actual,
    readProjectConfiguration: vi.fn(),
    formatFiles: vi.fn(),
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };
});

vi.mock('fs');

import {
  Tree,
  formatFiles,
  logger,
  readProjectConfiguration,
} from '@nx/devkit';
import * as fs from 'fs';
import { rebuildNativeModules } from '../../util/utils';
import { _buildNativeGenerator, buildNativeGenerator } from './generator';

describe('_buildNativeGenerator', () => {
  let tree: Tree;

  const mockSchemaWithHostProject = {
    hostProject: 'test-project',
    npmPackageName: 'test-package',
  };

  const mockSchemaWithPathTarget = {
    npmPackageName: 'test-package',
    pathTarget: 'custom/path/native',
  };

  // Add mock for process.exit
  const mockExit = vi.spyOn(process, 'exit').mockImplementation((number) => {
    throw new Error('process.exit: ' + number);
  });

  beforeEach(() => {
    tree = {
      // Mock the Tree methods you need
      children: vi.fn().mockReturnValue(['electron-nx-vite.config.ts']),
      exists: vi.fn().mockReturnValue(false),
      write: vi.fn(),
    } as unknown as Tree;

    // Reset the mock for readProjectConfiguration before each test
    (readProjectConfiguration as Mock).mockReset();
    // Reset the process.exit mock
    mockExit.mockClear();

    // Reset logger mocks
    (logger.error as Mock).mockClear();
    (logger.info as Mock).mockClear();
    (logger.warn as Mock).mockClear();
    (logger.debug as Mock).mockClear();

    vi.clearAllMocks();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it('should exit with error if the host project does not exist', async () => {
    (readProjectConfiguration as Mock).mockReturnValue(undefined);

    await expect(
      _buildNativeGenerator(tree, {
        ...mockSchemaWithHostProject,
        hostProject: 'non-existent-project',
      })
    ).rejects.toThrow('process.exit: 1');

    expect(logger.error).toHaveBeenCalledWith(
      'there is no app called non-existent-project in the structure of the monorepo. Aborting'
    );
    // expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should throw error if neither hostProject nor pathTarget is provided', async () => {
    await expect(
      _buildNativeGenerator(tree, {
        npmPackageName: 'test-package',
      })
    ).rejects.toThrow(
      'You must provide either a hostProject or a pathTarget. Aborting.'
    );
  });

  it('should throw error if sourceRoot is not defined for hostProject', async () => {
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      // No sourceRoot defined
    });

    await expect(
      _buildNativeGenerator(tree, mockSchemaWithHostProject)
    ).rejects.toThrow(
      'The project test-project does not have a sourceRoot defined. Aborting.'
    );
  });

  it('should call rebuildNativeModules with the correct packages using hostProject', async () => {
    (rebuildNativeModules as Mock).mockResolvedValue({
      successful: [],
      failed: [],
    });
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    }); // Simulate existing project with sourceRoot
    await _buildNativeGenerator(tree, mockSchemaWithHostProject);
    expect(rebuildNativeModules).toHaveBeenCalledWith(['test-package']);
  });

  it('should call rebuildNativeModules with the correct packages using pathTarget', async () => {
    (rebuildNativeModules as Mock).mockResolvedValue({
      successful: [],
      failed: [],
    });
    await _buildNativeGenerator(tree, mockSchemaWithPathTarget);
    expect(rebuildNativeModules).toHaveBeenCalledWith(['test-package']);
  });

  it('should process packages with comma separation and trimming', async () => {
    (rebuildNativeModules as Mock).mockResolvedValue({
      successful: [],
      failed: [],
    });
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    });

    await _buildNativeGenerator(tree, {
      ...mockSchemaWithHostProject,
      npmPackageName: 'package1, package2,package3 , package4',
    });

    expect(rebuildNativeModules).toHaveBeenCalledWith([
      'package1',
      'package2',
      'package3',
      'package4',
    ]);
  });

  it('should log an error for each failed native module', async () => {
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    }); // Simulate existing project with sourceRoot

    const failedModules = [
      {
        moduleName: 'test-package-1',
        error: 'Error rebuilding module',
      },
      {
        moduleName: 'test-package-2',
        error: 'Error rebuilding module',
      },
      {
        moduleName: 'test-package-3',
        error: 'Error rebuilding module',
      },
    ];

    (rebuildNativeModules as Mock).mockResolvedValue({
      successful: [],
      failed: failedModules,
    });

    await _buildNativeGenerator(tree, mockSchemaWithHostProject);

    expect(logger.error).toHaveBeenCalledWith(
      '❌ Failed to rebuild modules: test-package-1, test-package-2, test-package-3'
    );
  });

  it('should log success for successfully built modules with hostProject', async () => {
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    }); // Simulate existing project with sourceRoot

    (rebuildNativeModules as Mock).mockResolvedValue({
      successful: [
        {
          moduleName: 'test-package',
          nativeFilePath: 'path/to/native/module.node',
        },
      ],
      failed: [],
    });

    await _buildNativeGenerator(tree, mockSchemaWithHostProject);

    expect(logger.info).toHaveBeenCalledWith(
      '✅ Successfully rebuilt modules: test-package'
    );
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should log success for successfully built modules with pathTarget', async () => {
    (rebuildNativeModules as Mock).mockResolvedValue({
      successful: [
        {
          moduleName: 'test-package',
          nativeFilePath: 'path/to/native/module.node',
        },
      ],
      failed: [],
    });

    await _buildNativeGenerator(tree, mockSchemaWithPathTarget);

    expect(logger.info).toHaveBeenCalledWith(
      '✅ Successfully rebuilt modules: test-package'
    );
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should show dry-run messages without executing actions', async () => {
    const originalArgv = process.argv;
    process.argv = [...process.argv, '--dry-run'];

    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    });

    await _buildNativeGenerator(tree, mockSchemaWithHostProject);

    expect(logger.warn).toHaveBeenCalledWith(
      'Note: The argument --dry-run is partially supported in this generator.\n- Electron rebuild will be executed to rebuild native node modules.\n- A log of files changed in the tree will be shown, but no changes will be made.\n'
    );

    // Cleanup
    process.argv = originalArgv;
  });

  it('should throw error if electron-nx-vite.config.ts is missing when using hostProject', async () => {
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    });
    (tree.children as Mock).mockReturnValue(['some-other-file.ts']); // Config file missing

    await expect(
      _buildNativeGenerator(tree, mockSchemaWithHostProject)
    ).rejects.toThrow(
      'The selected project is not an @erickrodrcodes/nx-electron-vite host project. Aborting.'
    );
  });

  it('should throw error if npmPackageName is empty', async () => {
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    });

    await expect(
      _buildNativeGenerator(tree, {
        ...mockSchemaWithHostProject,
        npmPackageName: '',
      })
    ).rejects.toThrow(
      'No modules were provided to rebuild a node binary. Aborting'
    );
  });

  it('should throw error if npmPackageName contains only whitespace', async () => {
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    });

    await expect(
      _buildNativeGenerator(tree, {
        ...mockSchemaWithHostProject,
        npmPackageName: '   ',
      })
    ).rejects.toThrow(
      'No modules were provided to rebuild a node binary. Aborting'
    );
  });

  it('should copy successful build modules to the project tree when using hostProject', async () => {
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    });

    const successfulModule = {
      moduleName: 'test-package',
      nativeFilePath: 'path/to/native/module.node',
    };

    (rebuildNativeModules as Mock).mockResolvedValue({
      successful: [successfulModule],
      failed: [],
    });

    // Mock fs.readFileSync to return a Buffer
    (fs.readFileSync as Mock).mockReturnValue(Buffer.from('mocked content'));

    await _buildNativeGenerator(tree, mockSchemaWithHostProject);

    // Verify native directory creation
    expect(tree.exists).toHaveBeenCalledWith(
      'apps/test-project/src/main/native'
    );

    // Verify module file copy - we don't need to check for .keep files anymore as
    // that's part of the ensureDirectoryExists internal function
    expect(tree.write).toHaveBeenCalledWith(
      'apps/test-project/src/main/native/test-package.node',
      expect.any(Buffer)
    );
  });

  it('should copy successful build modules to the custom path when using pathTarget', async () => {
    const successfulModule = {
      moduleName: 'test-package',
      nativeFilePath: 'path/to/native/module.node',
    };

    (rebuildNativeModules as Mock).mockResolvedValue({
      successful: [successfulModule],
      failed: [],
    });

    // Mock fs.readFileSync to return a Buffer
    (fs.readFileSync as Mock).mockReturnValue(Buffer.from('mocked content'));

    await _buildNativeGenerator(tree, mockSchemaWithPathTarget);

    // Verify directory creation and file copying
    expect(tree.exists).toHaveBeenCalledWith('custom/path/native');

    // Verify module file copy
    expect(tree.write).toHaveBeenCalledWith(
      'custom/path/native/test-package.node',
      expect.any(Buffer)
    );
  });

  it('should handle errors when copying native modules', async () => {
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    });

    const successfulModule = {
      moduleName: 'test-package',
      nativeFilePath: 'path/to/native/module.node',
    };

    (rebuildNativeModules as Mock).mockResolvedValue({
      successful: [successfulModule],
      failed: [],
    });

    // Mock fs.readFileSync to return a Buffer
    (fs.readFileSync as Mock).mockReturnValue(Buffer.from('mocked content'));

    // Mock tree.write to throw error for the module file, but not for directory creation
    (tree.write as Mock).mockImplementation((path, content) => {
      // Only throw for the actual module file (the last call)
      if (path.endsWith('test-package.node')) {
        throw new Error('Resource busy or locked');
      }
    });

    await _buildNativeGenerator(tree, mockSchemaWithHostProject);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Unable to write the module test-package.node')
    );
  });
});

describe('buildNativeGenerator', () => {
  let tree: Tree;
  const originalArgv = process.argv;

  // Add mock for process.exit in this describe block too
  const mockExit = vi.spyOn(process, 'exit').mockImplementation((number) => {
    throw new Error('process.exit: ' + number);
  });

  beforeEach(() => {
    tree = {
      children: vi.fn().mockReturnValue(['electron-nx-vite.config.ts']),
      exists: vi.fn().mockReturnValue(false),
      write: vi.fn(),
    } as unknown as Tree;

    vi.clearAllMocks();
    mockExit.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it('should call _buildNativeGenerator and formatFiles', async () => {
    // Mock readProjectConfiguration to return valid project config
    (readProjectConfiguration as Mock).mockReturnValue({
      root: 'apps/test-project',
      sourceRoot: 'apps/test-project/src',
    });

    const mockSchema = {
      hostProject: 'test-project',
      npmPackageName: 'test-package',
    };

    // Ensure process.argv exists and doesn't include --dry-run
    process.argv = ['node', 'script.js'];

    await buildNativeGenerator(tree, mockSchema);

    // Test that formatFiles was called
    expect(formatFiles).toHaveBeenCalledWith(tree);
  });
});
