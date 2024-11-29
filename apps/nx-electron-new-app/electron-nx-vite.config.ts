// Nx Electron plugin for vite
import electron from 'vite-plugin-electron/simple';
import { startup } from 'vite-plugin-electron';

export function electronNxViteConfig() {
  return electron({
    main: {
      entry: 'src/main/main.ts',
      onstart: () => {
        startup(['--inspect=5858','../../dist/apps/nx-electron-new-app/main.js']);
      },
      vite: {
        build: {
          outDir: '../../dist/apps/nx-electron-new-app/',
        },
      },
    },
    preload: {
      vite: {
        build: {
          outDir: '../../dist/apps/nx-electron-new-app/',
        },
      },
      input: 'src/preload/preload.ts',
    },
    // Ployfill the Electron and Node.js API for Renderer process.
    // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
    // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
    renderer:
      process.env.NODE_ENV === 'test'
        ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
          undefined
        : {},
  });
}

export default electronNxViteConfig;

