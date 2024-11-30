/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import {
  electronNxViteConfig,
  redirectWhenAvailable,
} from './electron-nx-vite.config';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/electron-nx-new-app',
  server: {
    open: false,
    port: 3000,
  },
  plugins: [
    nxViteTsPaths(),
    electronNxViteConfig(),
    redirectWhenAvailable('http://localhost:4200'),
  ],
  build: {
    outDir: '../../dist/apps/nx-electron-new-app',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
