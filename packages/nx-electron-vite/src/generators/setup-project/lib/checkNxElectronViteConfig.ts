import { Tree } from "@nx/devkit";
import { InitGeneratorSchema } from "../schema";

/**
 * Ensures no duplicate Nx Electron Vite config in vite.config.ts.
 *
 * Reads the project's vite.config.ts file and checks if it already contains an Nx Electron Vite configuration.
 * If found, it throws an error to prevent duplication of configuration.
 *
 * @param viteConfigPath - The path to the vite.config.ts file.
 * @param tree - Access to the file system.
 * @param options - Schema options for initialization, used to identify the host project.
 * @throws Error if an Nx Electron Vite configuration is already present.
 */
export const checkNxElectronViteConfig = (
  viteConfigPath: string,
  tree: Tree,
  options: InitGeneratorSchema
) => {
  // read the project's vite config and add a new target for electron to build, which
  // requires to build first the vite project and then the electron project
  const contents = tree.read(viteConfigPath)?.toString() || '';
  if (contents.includes('electronNxViteConfig')) {
    throw new Error(
      `The project "${options.hostProject}" already contains an Nx Electron Vite implementation. Aborting.`
    );
  }
};
