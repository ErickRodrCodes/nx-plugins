export const versionLibraries = {
  electronBuilder: '26.15.3',
  electronRebuild: '4.2.0',
  electron: '43.4.0',
  vitePluginElectronRenderer: '0.14.6',
  vitePluginElectron: '0.29.1',
  png2icons: '2.0.1',
  suggestedNode: 'v24.18.1',
  waitOn: '9.1.0',
  // Electron 43.4.0 embeds Node v24.18.1 (see electron/electron DEPS). Native
  // addons are rebuilt against that ABI, so building on an older major produces
  // a binary the packaged app cannot dlopen.
  node: '24.18.1',
  vitest: '4.0.0',
  electronIsDev: '3.0.1',
  electronLog: '5.4.3',
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
  'electron-is-dev',
  'electron-log',
];
