import {
  addProjectConfiguration,
  generateFiles,
  runTasksInSerial,
  Tree,
} from '@nx/devkit';
import {
  cleanupDependencies,
  installDependencies,
  isApplication,
  normalizeOptions,
} from '../../util/utils';
import { updateDependencies } from './generator';
import { SetupProjectSchema } from './schema';

// --- Mocks for external dependencies ---
jest.mock('@nx/devkit', () => ({
  addProjectConfiguration: jest.fn(),
  formatFiles: jest.fn().mockResolvedValue(undefined),
  generateFiles: jest.fn(),
  runTasksInSerial: jest.fn(),
}));
jest.mock('../../util/utils', () => ({
  cleanupDependencies: jest.fn(),
  installDependencies: jest.fn(),
  isApplication: jest.fn(),
  normalizeOptions: jest.fn(),
}));

// Add after the imports
interface NormalizedOptions {
  guestProject: string;
  directory: string;
  directoryRoot: string;
  nameProject: string;
  outputDistFolderIcons: string;
  outputDistFolder: string;
  author: string;
  description: string;
}

// --- Tests for updateDependencies ---
describe('updateDependencies', () => {
  describe('when the selected project is not an application', () => {
    let tree: Tree;
    let schema: SetupProjectSchema;
    const fakeOptions = {
      guestProject: 'non-app',
      directory: 'dummy/directory',
      nameProject: 'test-project',
      outputDistFolderIcons: 'dist/icons',
      outputDistFolder: 'dist/main',
      author: 'Test Author',
      description: 'Test Description',
    };

    beforeEach(() => {
      tree = { delete: jest.fn() } as unknown as Tree;
      schema = { guestProject: 'non-app' } as SetupProjectSchema;
      (normalizeOptions as jest.Mock).mockResolvedValue(fakeOptions);
      (isApplication as jest.Mock).mockResolvedValue(false);
    });

    it('should throw an error if project is not an application', async () => {
      await expect(async () => {
        await updateDependencies(tree, schema);
      }).rejects.toThrow('The selected project is not an application');
    });
  });
});

// --- Tests for setupProjectGenerator ---
describe('setupProjectGenerator', () => {
  let tree: Tree;
  let schema: SetupProjectSchema;
  let fakeOptions: NormalizedOptions;
  let cleanupTask: jest.Mock;
  let installTask: jest.Mock;
  const tasksResult = 'tasksCompleted';

  beforeEach(async () => {
    tree = {
      delete: jest.fn(),
      exists: jest.fn().mockReturnValue(true),
      read: jest.fn(),
      write: jest.fn(),
    } as unknown as Tree;

    schema = {
      name: 'test-electron',
      guestProject: 'test-angular',
      author: 'Test Author',
      description: 'Test Description',
    } as SetupProjectSchema;

    fakeOptions = {
      guestProject: 'test-angular',
      directory: 'apps/test-electron',
      directoryRoot: 'apps/test-electron/src',
      nameProject: 'test-electron',
      outputDistFolderIcons: 'dist/apps/test-electron-icons',
      outputDistFolder: 'dist/apps/test-electron',
      author: 'Test Author',
      description: 'Test Description',
    };

    cleanupTask = jest.fn();
    installTask = jest.fn();

    (normalizeOptions as jest.Mock).mockResolvedValue(fakeOptions);
    (isApplication as jest.Mock).mockResolvedValue(true);
    (cleanupDependencies as jest.Mock).mockResolvedValue(cleanupTask);
    (installDependencies as jest.Mock).mockResolvedValue(installTask);
    (runTasksInSerial as jest.Mock).mockReturnValue(tasksResult);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Project Configuration', () => {
    it('should add correct project configuration', async () => {
      await updateDependencies(tree, schema);

      expect(addProjectConfiguration).toHaveBeenCalledWith(
        tree,
        fakeOptions.nameProject,
        expect.objectContaining({
          name: fakeOptions.nameProject,
          projectType: 'application',
          root: fakeOptions.directory,
          sourceRoot: fakeOptions.directoryRoot,
          implicitDependencies: [fakeOptions.guestProject],
        })
      );
    });

    it('should configure build target correctly', async () => {
      await updateDependencies(tree, schema);

      const configCall = (addProjectConfiguration as jest.Mock).mock
        .calls[0][2];
      expect(configCall.targets.build).toEqual({
        dependsOn: [{ projects: [fakeOptions.guestProject], target: 'build' }],
        executor: '@nx/vite:build',
        options: {
          outputPath: fakeOptions.outputDistFolder,
        },
      });
    });

    it('should configure electron target with correct serve and build configurations', async () => {
      await updateDependencies(tree, schema);

      const configCall = (addProjectConfiguration as jest.Mock).mock
        .calls[0][2];
      expect(configCall.targets.electron).toEqual({
        configurations: {
          build: {
            dependsOn: [
              { projects: [fakeOptions.nameProject], target: 'dist' },
            ],
          },
          serve: {
            dependsOn: [
              {
                projects: [fakeOptions.guestProject],
                target: 'build',
              },
              {
                projects: [fakeOptions.nameProject],
                target: 'build',
              },
            ],
            commands: [
              `nx run ${fakeOptions.guestProject}:serve`,
              `nx run ${fakeOptions.nameProject}:serve`,
            ],
            parallel: true,
          },
        },
        executor: 'nx:run-commands',
        defaultConfiguration: 'serve',
      });
    });

    it('should configure icon target with all modes', async () => {
      await updateDependencies(tree, schema);

      const configCall = (addProjectConfiguration as jest.Mock).mock
        .calls[0][2];
      expect(configCall.targets['nx-electron-icons']).toEqual({
        executor: '@erickrodrcodes/nx-electron-vite:build-icon',
        defaultConfiguration: 'default',
        dependsOn: [{ projects: [fakeOptions.nameProject], target: 'build' }],
        options: {
          hostProject: fakeOptions.nameProject,
          hostProjectRoot: '{projectRoot}',
          iconOutputPath: fakeOptions.outputDistFolderIcons,
          mode: 'composite',
        },
        configurations: {
          app: { mode: 'app' },
          setup: { mode: 'setup' },
          default: { mode: 'composite' },
        },
      });
    });

    it('should configure dist target with correct dependencies', async () => {
      await updateDependencies(tree, schema);

      const configCall = (addProjectConfiguration as jest.Mock).mock
        .calls[0][2];
      expect(configCall.targets.dist).toEqual({
        dependsOn: [
          { projects: [fakeOptions.nameProject], target: 'nx-electron-icons' },
        ],
        executor: '@erickrodrcodes/nx-electron-vite:build-electron',
        options: {
          hostProject: fakeOptions.nameProject,
          guestProject: fakeOptions.guestProject,
          hostProjectRoot: '{projectRoot}',
          mainOutputPath: fakeOptions.outputDistFolder,
          mainOutputFilename: 'main.js',
          author: fakeOptions.author,
          description: fakeOptions.description,
        },
      });
    });
  });

  describe('File Generation', () => {
    it('should generate project files', async () => {
      await updateDependencies(tree, schema);

      expect(generateFiles).toHaveBeenCalledWith(
        tree,
        expect.stringContaining('files'),
        fakeOptions.directory,
        expect.objectContaining(fakeOptions)
      );
    });
  });

  describe('Dependency Management', () => {
    it('should cleanup and install dependencies in correct order', async () => {
      await updateDependencies(tree, schema);

      expect(cleanupDependencies).toHaveBeenCalledWith(tree, fakeOptions);
      expect(installDependencies).toHaveBeenCalledWith(tree, fakeOptions);
      expect(runTasksInSerial).toHaveBeenCalledWith(cleanupTask, installTask);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-application guest project', async () => {
      (isApplication as jest.Mock).mockResolvedValue(false);

      await expect(updateDependencies(tree, schema)).rejects.toThrow(
        'The selected project is not an application'
      );
    });

    it('should handle missing guest project', async () => {
      const invalidSchema = { ...schema, guestProject: undefined };
      await expect(updateDependencies(tree, invalidSchema)).rejects.toThrow();
    });
  });

  describe('Options Normalization', () => {
    it('should normalize options before processing', async () => {
      await updateDependencies(tree, schema);

      expect(normalizeOptions).toHaveBeenCalledWith(tree, schema);
      expect(normalizeOptions).toHaveBeenCalledTimes(1);
    });
  });
});
