import {
  Tree,
  formatFiles,
  logger,
  readProjectConfiguration,
} from '@nx/devkit';
import * as fs from 'fs';
import { rebuildNativeModules } from '../../util/utils';
import { _buildNativeGenerator, buildNativeGenerator } from './generator';

jest.mock('../../util/utils', () => ({
  rebuildNativeModules: jest.fn(),
}));

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  readProjectConfiguration: jest.fn(),
  formatFiles: jest.fn(),
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('fs');

describe('_buildNativeGenerator', () => {
  let tree: Tree;
  const mockSchema = {
    hostProject: 'test-project',
    npmPackageName: 'test-package',
  };

  // Add mock for process.exit
  const mockExit = jest.spyOn(process, 'exit').mockImplementation((number) => {
    throw new Error('process.exit: ' + number);
  });

  beforeEach(() => {
    tree = {
      // Mock the Tree methods you need
      children: jest.fn().mockReturnValue(['electron-nx-vite.config.ts']),
      exists: jest.fn().mockReturnValue(false),
      write: jest.fn(),
    } as unknown as Tree;

    // Reset the mock for readProjectConfiguration before each test
    (readProjectConfiguration as jest.Mock).mockReset();
    // Reset the process.exit mock
    mockExit.mockClear();

    // Reset logger mocks
    (logger.error as jest.Mock).mockClear();
    (logger.info as jest.Mock).mockClear();
    (logger.warn as jest.Mock).mockClear();
    (logger.debug as jest.Mock).mockClear();

    jest.clearAllMocks();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it('should exit with error if the host project does not exist', async () => {
    (readProjectConfiguration as jest.Mock).mockReturnValue(undefined);

    await expect(
      _buildNativeGenerator(tree, {
        ...mockSchema,
        hostProject: 'non-existent-project',
      })
    ).rejects.toThrow('process.exit: 1');

    expect(logger.error).toHaveBeenCalledWith(
      'there is no app called non-existent-project in the structure of the monorepo. Aborting'
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should call rebuildNativeModules with the correct packages', async () => {
    (rebuildNativeModules as jest.Mock).mockResolvedValue({
      successful: [],
      failed: [],
    });
    (readProjectConfiguration as jest.Mock).mockReturnValue({}); // Simulate existing project
    await _buildNativeGenerator(tree, mockSchema);
    expect(rebuildNativeModules).toHaveBeenCalledWith(['test-package']);
  });

  it('should log an error for each failed native module', async () => {
    (readProjectConfiguration as jest.Mock).mockReturnValue({
      sourceRoot: 'apps/test-project/src',
    }); // Simulate existing project with sourceRoot

    const failedModules = [
      {
        moduleName: 'test-package-1',
        nativeFilePath: 'path/to/native/module1.node',
      },
      {
        moduleName: 'test-package-2',
        nativeFilePath: 'path/to/native/module2.node',
      },
      {
        moduleName: 'test-package-3',
        nativeFilePath: 'path/to/native/module3.node',
      },
    ];

    (rebuildNativeModules as jest.Mock).mockResolvedValue({
      successful: [],
      failed: failedModules,
    });

    await _buildNativeGenerator(tree, mockSchema);

    expect(logger.error).toHaveBeenCalledWith(
      '❌ Failed to rebuild modules: test-package-1, test-package-2, test-package-3'
    );
  });

  it('should log success for successfully built modules', async () => {
    (readProjectConfiguration as jest.Mock).mockReturnValue({
      sourceRoot: 'apps/test-project/src',
    }); // Simulate existing project with sourceRoot

    (rebuildNativeModules as jest.Mock).mockResolvedValue({
      successful: [
        {
          moduleName: 'test-package',
          nativeFilePath: 'path/to/native/module.node',
        },
      ],
      failed: [],
    });

    await _buildNativeGenerator(tree, mockSchema);

    expect(logger.info).toHaveBeenCalledWith(
      '✅ Successfully rebuilt modules: test-package'
    );
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should show dry-run messages without executing actions', async () => {
    const originalArgv = process.argv;
    process.argv = [...process.argv, '--dry-run'];

    (readProjectConfiguration as jest.Mock).mockReturnValue({
      sourceRoot: 'apps/test-project/src',
    });

    await _buildNativeGenerator(tree, mockSchema);

    expect(logger.warn).toHaveBeenCalledWith(
      'Note: The argument --dry-run is partially supported in this generator.\n- Electron rebuild will be executed to rebuild native node modules.\n- A log of files changed in the tree will be shown, but no changes will be made.\n'
    );

    // Cleanup
    process.argv = originalArgv;
  });

  it('should throw error if electron-nx-vite.config.ts is missing', async () => {
    (readProjectConfiguration as jest.Mock).mockReturnValue({
      root: 'apps/test-project',
    });
    (tree.children as jest.Mock).mockReturnValue(['some-other-file.ts']); // Config file missing

    await expect(_buildNativeGenerator(tree, mockSchema)).rejects.toThrow(
      'The selected project is not an @erickrodrcodes/nx-electron-vite host project. Aborting.'
    );
  });

  it('should throw error if npmPackageName is empty', async () => {
    (readProjectConfiguration as jest.Mock).mockReturnValue({
      root: 'apps/test-project',
    });

    await expect(
      _buildNativeGenerator(tree, {
        ...mockSchema,
        npmPackageName: '',
      })
    ).rejects.toThrow(
      'No modules were provided to rebuild a node binary. Aborting'
    );
  });

  it('should copy successful build modules to the project tree', async () => {
    (readProjectConfiguration as jest.Mock).mockReturnValue({
      sourceRoot: 'apps/test-project/src',
    });

    const successfulModule = {
      moduleName: 'test-package',
      nativeFilePath: 'path/to/native/module.node',
    };

    (rebuildNativeModules as jest.Mock).mockResolvedValue({
      successful: [successfulModule],
      failed: [],
    });

    // Mock fs.readFileSync to return a Buffer
    (fs.readFileSync as jest.Mock).mockReturnValue(
      Buffer.from('mocked content')
    );

    await _buildNativeGenerator(tree, mockSchema);

    // Verify native directory creation
    expect(tree.exists).toHaveBeenCalledWith(
      'apps/test-project/src/main/native'
    );

    // Verify .keep file creation
    expect(tree.write).toHaveBeenCalledWith(
      'apps/test-project/src/main/native/.keep',
      ''
    );

    // Verify module file copy
    expect(tree.write).toHaveBeenCalledWith(
      'apps/test-project/src/main/native/test-package.node',
      expect.any(Buffer)
    );
  });

  it('should handle errors when copying native modules', async () => {
    (readProjectConfiguration as jest.Mock).mockReturnValue({
      sourceRoot: 'apps/test-project/src',
    });

    const successfulModule = {
      moduleName: 'test-package',
      nativeFilePath: 'path/to/native/module.node',
    };

    (rebuildNativeModules as jest.Mock).mockResolvedValue({
      successful: [successfulModule],
      failed: [],
    });

    // Mock tree.write to throw error
    (tree.write as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Resource busy or locked');
    });

    await _buildNativeGenerator(tree, mockSchema);

    expect(logger.error).toHaveBeenCalledWith(
      'Unable to write the module test-package.node: Resource busy or locked'
    );
  });

  it('should handle comma-separated module names', async () => {
    (readProjectConfiguration as jest.Mock).mockReturnValue({
      sourceRoot: 'apps/test-project/src',
    });

    const schema = {
      ...mockSchema,
      npmPackageName: 'module1,module2,module3',
    };

    (rebuildNativeModules as jest.Mock).mockResolvedValue({
      successful: [],
      failed: [],
    });

    await _buildNativeGenerator(tree, schema);

    expect(rebuildNativeModules).toHaveBeenCalledWith([
      'module1',
      'module2',
      'module3',
    ]);
  });
});

describe('buildNativeGenerator', () => {
  beforeEach(() => {
    (formatFiles as jest.Mock).mockClear();
    jest
      .spyOn({ _buildNativeGenerator }, '_buildNativeGenerator')
      .mockImplementation(() => Promise.resolve(() => Promise.resolve()));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should format files after running the internal generator', async () => {
    const tree = {
      children: jest.fn().mockReturnValue(['electron-nx-vite.config.ts']),
      exists: jest.fn().mockReturnValue(false),
      write: jest.fn(),
      listChanges: jest.fn(),
    } as unknown as Tree;

    const schema = {
      hostProject: 'test-project',
      npmPackageName: 'test-package',
    };

    // Mock project configuration
    (readProjectConfiguration as jest.Mock).mockReturnValue({
      sourceRoot: 'apps/test-project/src',
    });

    await buildNativeGenerator(tree, schema);

    expect(formatFiles).toHaveBeenCalledWith(tree);
  });
});
