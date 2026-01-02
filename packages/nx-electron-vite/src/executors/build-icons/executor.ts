import {
  CommandParams,
  resolveIconCommand,
  ResolveIconCommandParams,
  runCommandUntil,
} from '../../util/utils';
import { BuildIconsExecutorSchema } from './schema';

export const generateAppIcon = async (options: BuildIconsExecutorSchema) =>
  runIconGenerator(options, 'icon');
export const generateAppSetup = async (options: BuildIconsExecutorSchema) =>
  runIconGenerator(options, 'setup');

async function runIconGenerator(
  options: BuildIconsExecutorSchema,
  type: 'icon' | 'setup'
) {
  const successString = 'png2icons done';
  const { hostProject, hostProjectRoot, iconOutputPath } = options;

  const generalParams: CommandParams = {
    hostProject,
    hostProjectRoot,
    osPlatform: process.platform,
    iconOutputPath,
  };

  const paramIcon: ResolveIconCommandParams = {
    ...generalParams,
    type,
  };

  const appCommand = await resolveIconCommand(paramIcon);

  const response = await runCommandUntil(appCommand, (criteria) =>
    criteria.includes(successString)
  );

  if (!response) {
    return {
      success: false,
      message: `Error while generating icons for ${type}`,
    };
  }

  return {
    success: true,
  };
}

// The main executor function for nx
export default async function runExecutor(options: BuildIconsExecutorSchema) {
  // Dispatch based on the provided mode:
  switch (options.mode) {
    case 'app': {
      return await generateAppIcon(options);
    }
    case 'setup': {
      return await generateAppSetup(options);
    }
    case 'composite': {
      // Run the app icon generation first.
      const appResult = await generateAppIcon(options);
      if (!appResult.success) {
        return appResult;
      }
      // Then run the setup icon generation.
      const setupResult = await generateAppSetup(options);
      if (!setupResult.success) {
        return setupResult;
      }
      return { success: true };
    }
    default: {
      return {
        success: false,
        message:
          'Invalid mode provided. Valid values are "app", "setup", or "composite".',
      };
    }
  }
}
