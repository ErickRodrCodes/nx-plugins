export const versionLibraries = {
  electronBuilder: '^24.13.3',
  electronRebuild: '^3.7.1',
  electron: '^30.0.2',
  vitePluginElectronRenderer: '^0.14.5',
  vitePluginElectron: '^0.28.6',
  png2icons: '^2.0.1',
  suggestedNode: 'v18.18.0',
  waitOn: '8.0.0',
  node: '20.17.0',
  vitest: '^1.6.0',
  electronIsDev: '^2.0.0',
};

export const devDependencies: string[] = [
  '@nx/vite',
  'electron-builder',
  '@electron/rebuild',
  'electron',
  'vite-plugin-electron-renderer',
  'vite-plugin-electron',
  'png2icons',
  'wait-on',
  'vitest',
  'electron-is-dev'
];
