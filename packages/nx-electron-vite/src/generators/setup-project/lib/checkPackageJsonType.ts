import { logger, writeJson } from "@nx/devkit";

/**
 * Ensures package.json has 'module' type.
 *
 * @param tree - File system access.
 * @param rootProject - Project config.
 */
export const checkPackageJsonType = (
  packageJson: { contents: Record<string, string> },
  tree
) => {
  if (!Object.keys(packageJson.contents).includes('type')) {
    packageJson.contents.type = 'module';
    writeJson(tree, 'package.json', packageJson.contents);
    logger.warn(
      '🚨 IMPORTANT 🚨 : Added type module to workspace package.json. This has several implications when running things like jest or tailwinds on the cli side. Type "Module" is required for nx-electron-vite to develop and build electron applications'
    );
  } else if (packageJson.contents.type !== 'module') {
    throw new Error(
      `Workspace package.json contains a type that is "${packageJson.contents.type}". Note that type "module" is required for nx-electron-vite to work properly.`
    );
  }
};
