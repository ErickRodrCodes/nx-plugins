export interface InitGeneratorSchema {
  /**
   * Skipping adding dependencies to the package.json
   */
  skipPackageJson?: boolean;

  /**
   * format files that will be modified during init
   */
  skipFormat?: boolean;

  /**
   * skip the installation of plugin dependencies.
   */
  skipInstallPluginDependencies?: boolean;
}
