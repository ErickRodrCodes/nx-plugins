import { ProjectConfiguration } from "@nx/devkit";

/**
 * Checks if the root project meets required criteria.
 *
 * @param rootProject - The project to validate.
 * @param options - Contains `hostProject` to specify the project name.
 * @throws Error if project not found or not an application.
 */
export const checkRootProject = (
  rootProject: ProjectConfiguration,
  options
) => {
  if (!rootProject) {
    throw new Error(`Could not find project with name ${options.hostProject}`);
  } else if (rootProject.projectType !== 'application') {
    throw new Error(
      `The Host Project with name ${options.hostProject} is not an application project. Please provide the name of an application project.`
    );
  }
};
