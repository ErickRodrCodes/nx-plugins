export interface InitGeneratorSchema {
  /**
   * Human readable name for the application
   */
  name: string;

  /**
   * application name with dashes
   */
  executableName: string;

  /**
   * Host frontend project with Vite we want to use Electron
   */
  hostProject: string;

  /**
   * path to the root of the project
   */
  hostProjectRoot: string;

  /**
   * author of the application
   */
  author: string;

  /**
   * description of the application
   */

  description: string;

  /**
   * workspace name
   */
  workspace?: string;

  /**
   * path to the dist folder of the host project
   */
  hostProjectDistFolder?: string;

  /**
   * path to the nsis Extra File Path
   */
  nsisExtraFilePath?: string;
}
