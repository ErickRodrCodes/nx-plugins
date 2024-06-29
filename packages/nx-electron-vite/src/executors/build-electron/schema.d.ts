export interface BuildElectronExecutorSchema {
  /**
   * The path of the main output file.
   */
  mainOutputPath: string;
  /**
   * The name of the main output file.
   */
  mainOutputFilename: string;
  /**
   * the name of the host project.
   */
  hostProject: string;
  /**
   * Path of the project root
   */
  hostProjectRoot: string;
  /**
   * target of build. all build by default will have a format for x64 processors
   */
  target: 'windows' | 'linux' | 'macos';
  /**
   * Path of the icon to be used in the application
   */
  iconApplicationPath: string;

  /**
   * author of the application
   */
  author: string;

  /**
   * description of the application
   */

  description: string;
}
