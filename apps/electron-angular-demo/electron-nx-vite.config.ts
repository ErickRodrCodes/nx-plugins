// Nx Electron plugin for vite
import electron from 'vite-plugin-electron/simple';
import { startup } from 'vite-plugin-electron';
import waitOn from 'wait-on';

export function electronNxViteConfig() {
  return electron({
    main: {
      entry: 'src/main/main.ts',
      onstart: () => {
        startup([
          '--inspect=5858',
          '../../dist/apps/electron-angular-demo/main.js',
        ]);
      },
      vite: {
        build: {
          outDir: '../../dist/apps/electron-angular-demo/',
        },
      },
    },
    preload: {
      vite: {
        build: {
          outDir: '../../dist/apps/electron-angular-demo/',
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

export function redirectWhenAvailable(url: string, timeout = 30000) {
  return {
    name: 'redirect-middleware',
    async configureServer(server) {
      try {
        await waitOn({
          resources: [`${url}`],
          timeout: 30000, // Adjust the timeout as needed
          log: false,
        });
        console.log(
          `\n🚀 Frontend application ${url} is available. Preparing electron to host Target Project.\n`
        );
      } catch (err) {
        console.error(`Error: unable to perform operatioin:`, err.message);
        process.exit(1); // Exit the process if Application A is not available
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

export default electronNxViteConfig;
