import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  runTasksInSerial,
  Tree,
} from '@nx/devkit';

import { join } from 'path';
import {
  cleanupDependencies,
  installDependencies,
  isApplication,
  normalizeOptions,
} from '../../util/utils';
import { SetupProjectSchema } from './schema';

export async function updateDependencies(
  tree: Tree,
  schema: SetupProjectSchema
) {
  const tasks: GeneratorCallback[] = [];

  if (!schema.guestProject) {
    throw new Error('Guest project is required');
  }

  const options: SetupProjectSchema = await normalizeOptions(tree, schema);

  if (!(await isApplication(tree, options.guestProject))) {
    throw new Error('The selected project is not an application. Aborting.');
  }

  // Cleanup and install dependencies
  const cleanupTask = await cleanupDependencies(tree, options);
  tasks.push(cleanupTask);

  const installTask = await installDependencies(tree, options);
  tasks.push(installTask);

  // Generate project files using the normalized project root
  generateFiles(tree, join(__dirname, 'files'), options.directory, {
    ...options,
  });

  // Add project configuration
  addProjectConfiguration(tree, options.nameProject, {
    name: options.nameProject,
    projectType: 'application',
    root: options.directory,
    sourceRoot: options.directoryRoot,
    implicitDependencies: [options.guestProject],
    targets: {
      build: {
        executor: '@nx/vite:build',
        dependsOn: [
          {
            projects: [options.guestProject],
            target: 'build',
          },
        ],
        options: {
          outputPath: options.outputDistFolder,
        },
      },
      serve: {
        executor: '@nx/vite:dev-server',
        options: {
          buildTarget: `${options.nameProject}:build`,
        },
        configurations: {
          electron: {
            dependsOn: ['build'],
            commands: [
              `nx run ${options.guestProject}:serve`,
              `nx run ${options.nameProject}:serve`,
            ],
            parallel: true,
          },
        },
      },
      electron: {
        configurations: {
          build: {
            dependsOn: [
              {
                projects: [options.nameProject],
                target: 'build',
              },
            ],
            options: {
              commands: [`nx run ${options.nameProject}:build`],
              parallel: false,
            },
          },
          serve: {
            dependsOn: ['build'],
            commands: [
              `nx run ${options.guestProject}:serve`,
              `nx run ${options.nameProject}:serve`,
            ],
            parallel: true,
          },
        },
        executor: 'nx:run-commands',
        defaultConfiguration: 'serve',
      },
      'nx-electron-icons': {
        executor: '@erickrodrcodes/nx-electron-vite:build-icon',
        defaultConfiguration: 'default',
        dependsOn: [
          {
            projects: [options.nameProject],
            target: 'build',
          },
        ],
        options: {
          hostProject: options.nameProject,
          hostProjectRoot: '{projectRoot}',
          iconOutputPath: options.outputDistFolderIcons,
          mode: 'composite',
        },
        configurations: {
          app: {
            mode: 'app',
          },
          setup: {
            mode: 'setup',
          },
          default: {
            mode: 'composite',
          },
        },
      },
      dist: {
        dependsOn: [
          {
            projects: [options.nameProject],
            target: 'nx-electron-icons',
          },
        ],
        executor: '@erickrodrcodes/nx-electron-vite:build-electron',
        options: {
          hostProject: options.nameProject,
          guestProject: options.guestProject,
          hostProjectRoot: '{projectRoot}',
          mainOutputPath: options.outputDistFolder,
          mainOutputFilename: 'main.js',
          author: options.author,
          description: options.description,
        },
      },
      preview: {
        executor: '@nx/vite:preview-server',
        options: {
          buildTarget: `${options.nameProject}:build`,
        },
      },
      test: {
        executor: '@nx/vite:test',
        options: {
          config: '{projectRoot}/vite.config.ts',
        },
      },
      lint: {
        dependsOn: ['^lint'],
      },
    },
  });

  return runTasksInSerial(...tasks);
}

export async function setupProjectGenerator(
  tree: Tree,
  schema: SetupProjectSchema
) {
  const installTask = await updateDependencies(tree, schema);
  await formatFiles(tree);
  return installTask;
}

export default setupProjectGenerator;
