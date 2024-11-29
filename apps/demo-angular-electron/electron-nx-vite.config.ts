// Nx Electron plugin for vite
import { startup } from 'vite-plugin-electron';
import electron from 'vite-plugin-electron/simple';
import waitOn from 'wait-on';

import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { Plugin, UserConfig } from 'vite';

rmSync(join('__dirname', 'dist'), { recursive: true, force: true });

export function electronNxViteConfig() {
  return electron({
    main: {
      entry: 'src/main/main.ts',
      onstart: () => {
        startup([
          '--inspect=5858',
          '../../dist/apps/demo-angular-electron/main.mjs',
        ]);
      },
      vite: {
        build: {
          minify: false,
          outDir: '../../dist/apps/demo-angular-electron',
          sourcemap: true,
          rollupOptions: {
            output: {
              entryFileNames: '[name].mjs',
            },
          },
        },
      },
    },
    preload: {
      vite: withDebug({
        build: {
          outDir: '../../dist/apps/demo-angular-electron',
          sourcemap: 'inline',
        },
      }),
      input: './src/preload/preload.ts',
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

/**
 * This function will redirect the electron window to the given URL when it is available. Usually, this url is the one used by the frontend application when
 * running the command `nx run electron-angular-demo:serve`. This is useful when you want to start the electron app only after the frontend application is available.
 * @param url the url of the guest frontend application
 * @param timeout a timeout to wait for the application to be available. Default is 50000ms
 * @returns voi
 */
export function redirectWhenAvailable(url: string, timeout = 50000) {
  return {
    name: 'redirect-middleware',
    async configureServer(server) {
      try {
        await waitOn({
          resources: [`${url}`],
          timeout,
          log: false,
        });
        console.log(
          `\n🚀 Frontend application ${url} is available. Preparing electron to host Target Project.\n`
        );
      } catch (err) {
        console.error(`Error: unable to perform operatioin:`, err.message);
        process.exit(1); // Exit the process if application is not available
      }

      server.middlewares.use((req, res, next) => {
        // Ignore requests for Vite's HMR websocket endpoint
        if (
          req?.url?.startsWith('/__vite_ping') ||
          req?.url?.startsWith('/@vite')
        ) {
          return next();
        }
        // Send a 302 redirect to localhost:4200
        res.writeHead(302, { Location: `${url}${req.url}` });
        res.end();
      });
    },
  };
}

/**
 * A function that enabled debugging capabilities
 */
export function withDebug(config: UserConfig): UserConfig {
  const debugFile = join(__dirname, 'node_modules/.electron-vite-debug');
  const isDebug = existsSync(debugFile);

  if (isDebug) {
    // Ensure config.build is defined
    config.build = config.build || {};
    config.build.sourcemap = true;
    config.plugins = (config.plugins || []).concat({
      name: 'electron-vite-debug',
      configResolved(config) {
        // TODO: when the next version of `vite-plugine-electron` is released, use the config hook.
        const index = config.plugins.findIndex(
          (p) => p.name === 'electron-main-watcher'
        );
        (config.plugins as Plugin[]).splice(index, 1);
        rmSync(debugFile);
      },
    });
  }

  return config;
}

export default electronNxViteConfig;
