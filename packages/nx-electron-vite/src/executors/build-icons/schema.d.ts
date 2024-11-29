export interface BuildIconsExecutorSchema {
  hostProject: string;
  hostProjectRoot: string;
  iconOutputPath: string;
  mode: 'app' | 'setup' | 'composite';
} // eslint-disable-line
