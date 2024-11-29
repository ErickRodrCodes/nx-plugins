/// <reference types='vitest' />
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vite';
import {
  electronNxViteConfig,
  redirectWhenAvailable,
} from './electron-nx-vite.config';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/demo-angular-electron',
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
    outDir: '../../dist/apps/demo-angular-electron',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].mjs',
      },
    },
  },
});
