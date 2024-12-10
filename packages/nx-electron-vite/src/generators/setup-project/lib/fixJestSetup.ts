import { logger, ProjectConfiguration, Tree, workspaceRoot } from "@nx/devkit";
import { InitGeneratorSchema } from "../schema";
import path = require("path");

/**
 * Configures Jest for the project.
 *
 * Updates the Jest setup file to ensure compatibility with the project's testing requirements.
 * This may include configuring global mocks, setting up test environments, or other Jest configurations necessary for the project.
 *
 * @param tree - Access to the file system.
 * @param rootProject - Project configuration object, used to locate and modify the Jest setup file.
 */
export const fixJestSetup = (
  rootProject: ProjectConfiguration,
  tree: Tree,
  options: InitGeneratorSchema
) => {
  const jestPresetFile = path.join(workspaceRoot, 'jest.preset.js');
  const jestProjectConfigFile = path.join(rootProject.root, 'jest.config.ts');

  //1. rename the preset on the workspace
  const jestPresetExists = tree.exists('jest.preset.js');
  if (!jestPresetExists) {
    logger.warn(
      `🚨 IMPORTANT 🚨 If the project ever configure jest tests for ${options.hostProject}, make sure to rename the workspace jest.preset.js to jest.preset.cjs.`
    );
  } else {
    tree.rename('jest.preset.js', 'jest.preset.cjs');
    logger.info(
      `✅ Found jest preset on workspace. Renamed jest.preset.js to jest.preset.cjs`
    );
    logger.warn(
      `If you have other projects using jest, make sure to reference the new jest.prese.cjs on those.`
    );
  }

  //2. replace any text that might contain jest.preset.js in the target project

  if (tree.exists(jestProjectConfigFile)) {
    let readContents = tree.read(jestProjectConfigFile).toString();
    readContents = readContents.replace('jest.preset.js', 'jest.preset.cjs');
    tree.write(jestProjectConfigFile, readContents);
    logger.info(
      `✅ Found jest.config.ts in project ${rootProject.name}. Replaced reference of jest.preset.js to jest.preset.cjs`
    );
  } else {
    logger.warn(
      `🚨 IMPORTANT 🚨 If the project ever configure jest tests for ${rootProject.name}, make sure to reference the workspace jest.preset.cjs in your jest.config.ts file.`
    );
  }
};
