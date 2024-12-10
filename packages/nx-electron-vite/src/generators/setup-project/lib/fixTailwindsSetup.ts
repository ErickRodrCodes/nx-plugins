import { logger, ProjectConfiguration, Tree } from "@nx/devkit";
import { InitGeneratorSchema } from "../schema";
import path = require("path");

/**
 * Adjusts the PostCSS configuration for compatibility.
 *
 * Modifies the project's PostCSS configuration to ensure compatibility with Nx Electron and Vite.
 * This may involve adding or modifying plugins, setting options, or other adjustments specific to the project setup.
 *
 * @param tree - Access to the file system.
 * @param rootProject - Project configuration object, used to locate the PostCSS config file.
 */
export const fixTailwindsSetup = (
  rootProject: ProjectConfiguration,
  tree: Tree,
  options: InitGeneratorSchema
) => {
  const postcssFile = path.join(rootProject.root, 'postcss.config.js');
  if (!tree.exists(postcssFile)) {
    logger.warn(
      `🚨 IMPORTANT 🚨 If the project ever runs an @nx generator for tailwinds on ${options.hostProject}, make sure to rename postcss.config.js to postcss.config.cjs.`
    );
  } else {
    //rename postcss.config.js to postcss.config.cjs
    tree.rename(postcssFile, path.join(rootProject.root, 'postcss.config.cjs'));
    logger.info(
      `✅ Found taildwinds config. Renamed postcss.config.js to postcss.config.cjs`
    );
  }
};
