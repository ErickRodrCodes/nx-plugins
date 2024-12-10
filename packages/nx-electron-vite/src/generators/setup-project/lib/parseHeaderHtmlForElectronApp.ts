import { ProjectConfiguration, Tree } from "@nx/devkit";
import path = require("path");

/**
 * Adjusts the `index.html` for Electron compatibility.
 *
 * This function modifies the base href and adds Content Security Policy meta tags to the `index.html` of the root project.
 * It ensures the application can be loaded correctly in an Electron environment by adjusting paths and enhancing security.
 *
 * @param tree - Represents the file system.
 * @param rootProject - The project configuration object.
 */
export const parseHeaderHtmlForElectronApp = (
  tree: Tree,
  rootProject: ProjectConfiguration
) => {
  const indexHtmlPath = path.join(rootProject.root, 'index.html');
  if (tree.exists(indexHtmlPath)) {
    let indexHtml = tree.read(indexHtmlPath)?.toString();
    if (indexHtml.includes('<base href="/" />')) {
      indexHtml = indexHtml.replace('<base href="/" />', '<base href="./" />');
    }

    if (!indexHtml.includes('http-equiv="X-Content-Security-Policy')) {
      indexHtml = indexHtml.replace(
        '</head>',
        `
        <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
      />
      <meta
        http-equiv="X-Content-Security-Policy"
        content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
      />
      </head>`
      );
    }

    tree.write(indexHtmlPath, indexHtml);
  }
};
