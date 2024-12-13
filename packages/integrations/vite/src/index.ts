import _ from 'lodash-es';
import Debug from 'debug';
import { checkServiceIsValid, DmnoServer, injectDmnoGlobals } from 'dmno';
import type { Plugin } from 'vite';

const debug = Debug('dmno:vite-integration');

let firstLoad = !(process as any).dmnoServer;

debug('dmno vite plugin loaded. first load = ', firstLoad);

let isDevMode: boolean;
let dmnoHasTriggeredReload = false;
let configItemKeysAccessed: Record<string, boolean> = {};
let dmnoConfigValid = true;
let dmnoServer: DmnoServer;
let dmnoInjectionResult: ReturnType<typeof injectDmnoGlobals>;

async function reloadDmnoConfig() {
  (process as any).dmnoServer ||= new DmnoServer({ watch: true });
  dmnoServer = (process as any).dmnoServer;
  const resolvedService = await dmnoServer.getCurrentPackageConfig();
  const injectedConfig = resolvedService.injectedDmnoEnv;
  dmnoConfigValid = resolvedService.serviceDetails.isValid;
  configItemKeysAccessed = {};

  // shows nicely formatted errors in the terminal
  checkServiceIsValid(resolvedService.serviceDetails);

  dmnoInjectionResult = injectDmnoGlobals({
    injectedConfig,
    trackingObject: configItemKeysAccessed,
  });
}

// we run this right away so the globals get injected into the vite.config file
await reloadDmnoConfig();



export function injectDmnoConfigVitePlugin(
  options?: {
    /**
     * option to bundle DMNO_CONFIG as well, which will include all config items
     * should be used carefully as it could leak secrets...
     * but necessary if bundling backend code using vite
     * */
    injectSensitiveConfig: boolean,
  },
): Plugin {
  const dmnoServer: DmnoServer = (process as any).dmnoServer;

  return {
    name: 'inject-dmno-config',
    enforce: 'pre', // not positive this matters

    // this function will get called on each restart!
    async config(config, env) {
      isDevMode = env.command === 'serve';

      // this handles the case where astro's vite server reloaded but this file did not get reloaded
      // we need to reload if we just found out we are in dev mode - so it will use the config client
      if (dmnoHasTriggeredReload) {
        await reloadDmnoConfig();
        dmnoHasTriggeredReload = false;
      }

      // inject rollup rewrites via config.define
      config.define = {
        ...config.define,
        ...dmnoInjectionResult.staticReplacements.dmnoPublicConfig,
        ...options?.injectSensitiveConfig && dmnoInjectionResult.staticReplacements.dmnoConfig,
      };

      if (!dmnoConfigValid) {
        if (isDevMode) {
          // adjust vite's setting so it doesnt bury the error messages
          config.clearScreen = false;
        } else {
          dmnoServer.shutdown();
          console.log('💥 DMNO config validation failed 💥');
          // throwing an error spits out a big useless stack trace... so better to just exit?
          process.exit(1);
        }
      }
    },
    async configureServer(server) {
      // not sure about this...
      if (firstLoad && server.config.command === 'serve') {
        firstLoad = false;
        dmnoServer.enableWatchMode(() => {
          // console.log('vite config received reload event');
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          server.restart();
          dmnoHasTriggeredReload = true;
        });
      }
      // if (!dmnoConfigValid) {
      //   // triggers the built-in vite error overlay
      //   server.middlewares.use((req, res, next) => {
      //     server.hot.send({
      //       type: 'error',
      //       err: {
      //         plugin: 'DMNO',
      //         message: 'Your config is currently invalid - check your terminal for more details',
      //         stack: '',
      //       },
      //     });
      //     return next();
      //   });
      // }
    },

    transformIndexHtml(html) {
      if (!dmnoConfigValid) {
        // TODO: build a nice error page somehow and just use it here
        // we should be showing you specific errors and have links to the right files/lines where possible
        return `
<html>
<head>
  <script type="module" src="/@vite/client"></script>
  <title>Invalid config</title>
</head>
<body>
  <h2>Your DMNO config is currently invalid!</h2>
  <p>Check your terminal for more details</p>
</body>
</html>
        `;
      }

      const publicConfig: Record<string, any> = (globalThis as any).DMNO_PUBLIC_CONFIG;
      const allConfig: Record<string, any> = (globalThis as any).DMNO_CONFIG;
      return html.replace(
        // we'll match for both DMNO_CONFIG.xxx and DMNO_PUBLIC_CONFIG.xxx
        // so that we can show more helpful error messages
        /%DMNO(_PUBLIC)?_CONFIG\.([a-zA-Z_][a-zA-Z0-9._]*)%/g,
        (_fullMatch, usedPublic, itemKey) => {
          // we'll throw some better errors here that are more helpful than letting the injected DMNO_PUBLIC_CONFIG throw
          if (!usedPublic) {
            if (Object.hasOwn(publicConfig, itemKey)) {
              throw new Error(`Only \`DMNO_PUBLIC_CONFIG\` is available in vite html replacements - use \`%DMNO_PUBLIC_CONFIG.${itemKey}%\` instead`);
            } else if (Object.hasOwn(allConfig, itemKey)) {
              throw new Error('Only `DMNO_PUBLIC_CONFIG` is available in vite html replacements');
            }
          } else {
            if (Object.hasOwn(allConfig, itemKey) && !Object.hasOwn(publicConfig, itemKey)) {
              throw new Error(`\`DMNO_PUBLIC_CONFIG.${itemKey}\` does not exist because it is a sensitive config item`);
            }
          }
          // will still throw the "item does not exist" error if it reaches here
          return publicConfig[itemKey];
        },
      );
    },

    // handleHotUpdate({ file, server }) {
    //   console.log('hot update', file);
    // },
    buildEnd() {
      if (!isDevMode) dmnoServer.shutdown();
    },
  };
}
