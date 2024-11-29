/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import electronNxViteConfig from './electron-nx-vite.config';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/demo-react',
  server: {
    port: 4444,
    open: 'http://localhost:4200',
  },
  appType: 'custom',
  plugins: [nxViteTsPaths(), electronNxViteConfig()],
  build: {
    outDir: '../../dist/apps/nx-electron-new-app',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
