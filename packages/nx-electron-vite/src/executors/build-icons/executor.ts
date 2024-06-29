import { BuildIconsExecutorSchema } from './schema';
import { osPlatform, resolveIconCommand, resolveIconCommandParams, runCommandUntil } from '../../util/utils';

export default async function runExecutor(options: BuildIconsExecutorSchema) {
  const successString = 'png2icons done';
  const { hostProject, hostProjectRoot,iconOutputPath } = options;

  const generalParams = {
    hostProject,
    hostProjectRoot,
    iconOutputPath,
    osPlatform,
  }

  const paramIcon: resolveIconCommandParams = { ...generalParams, type: 'icon' };
  const paramSetup: resolveIconCommandParams = { ...generalParams, type: 'setup' };

  const iconAppCommand = await resolveIconCommand(paramIcon);
  const iconSetupCommand = await resolveIconCommand(paramSetup);

  const responseIcon = await runCommandUntil(iconAppCommand, (criteria)=> {
    return criteria.includes(successString);
  })

  const responseSetup = await runCommandUntil(iconSetupCommand, (criteria)=> {
    return criteria.includes(successString);
  })

  if(!responseSetup || !responseIcon) {
    return {
      success: false,
      message: 'Error while generating icons'
    }
  }

  return {
    success: true,
  };
}
