export interface SetupProjectSchema {
  /**
   * indicates if the produced project will include an update script
   */
  updater: boolean;

  /**
   * The name of the project that we will use in electron.
   */
  guestProject: string;

  /**
   * The name of the project in human language
   */
  name: string;

  /**
   * The name of the project in kebab case
   */
  nameProject: string | null;

  /**
   * author of the project
   */
  author: string;

  /**
   * a brief description of the project
   */
  description: string;

  /**
   * directory where the project will be created.
   * Relative to the workspace root.
   * per see, it is a directory that will contain the directory where the new
   * application will be generated.
   */
  directory: string;

  /**
   * the test runner to use
   */
  testRunner: string;

  /**
   * the executable name the produced electron file will have
   */
  executableName: string;

  /**
   * the guest project root path
   */
  guestProjectRoot?: string;

  /**
   * The executable name that the build app will have.
   */
  executableName: string;

  /**
   * the path to the dist folder of the project to be guested.
   */
  guestDistFolder?: string;

  /**
   * the path to the build folder of the project icons for electron.
   */
  guestDistFolderIcons?: string;

  /**
   * The path of the source electron files of the host project
   */
  directoryRoot?: string;

  /**
   * the path of the resources directory on the host application
   */
  directoryResources?: string;

  /**
   * the path of the generated icons for the electron application
   */
  outputDistFolderIcons?: string;

  /**
   * the path of the generated electron application
   */
  outputDistFolder?: string;

  /**
   * Offset from the root of the workspace
   */
  offsetFromRoot?: string;

  /**
   * the path to the root tsconfig file
   */
  rootTsConfigPath?: string;

  /**
   * path to the nsis install file
   */
  nsisExtraFilePath?: string;
}
