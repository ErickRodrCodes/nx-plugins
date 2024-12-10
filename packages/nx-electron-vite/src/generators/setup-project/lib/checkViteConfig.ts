import { ProjectConfiguration } from "@nx/devkit";
import { InitGeneratorSchema } from "../schema";
import path = require("path");

/**
 * Validates existence of Vite config in the root project.
 *
 * @param rootProject - The project being checked.
 * @param tree - Represents the file system.
 * @param options - Additional options, unused here.
 * @throws Error if Vite config is missing.
 */
export const checkViteConfig = (
  rootProject: ProjectConfiguration,
  tree,
  options: InitGeneratorSchema
) => {
  const viteConfigPath = path.join(rootProject.root, 'vite.config.ts');
  if (!tree.exists(viteConfigPath)) {
    throw new Error(
      `Could not find vite.config.ts in the root of the project ${options.hostProject}`
    );
  }

  return viteConfigPath;
};
