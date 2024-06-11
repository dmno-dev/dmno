import _ from 'lodash-es';
import Debug from 'debug';
import { ConfigServerClient, DmnoConfigItem, injectDmnoGlobals } from 'dmno';
import type { Plugin } from 'vite';

const debug = Debug('dmno:vite-integration');

let firstLoad = !(process as any).dmnoConfigClient;

debug('dmno vite plugin loaded. first load = ', firstLoad);

let isDevMode: boolean;
let dmnoHasTriggeredReload = false;
let enableDynamicPublicClientLoading = false;
let configItemKeysAccessed: Record<string, boolean> = {};
let dmnoConfigValid = true;
let dynamicItemKeys: Array<string> = [];
let publicDynamicItemKeys: Array<string> = [];
let sensitiveItemKeys: Array<string> = [];
let sensitiveValueLookup: Record<string, { redacted: string, value: string }> = {};
let viteDefineReplacements = {} as Record<string, string>;
let dmnoConfigClient: ConfigServerClient;

async function reloadDmnoConfig() {
  let injectionResult: ReturnType<typeof injectDmnoGlobals>;
  const injectedEnvExists = (globalThis as any)._DMNO_INJECTED_ENV || globalThis.process?.env.DMNO_INJECTED_ENV;

  if (injectedEnvExists && !isDevMode) {
    debug('using injected dmno config');
    injectionResult = injectDmnoGlobals();
  } else {
    debug('using injected dmno config server');
    (process as any).dmnoConfigClient ||= new ConfigServerClient();
    dmnoConfigClient = (process as any).dmnoConfigClient;
    const serializedService = await dmnoConfigClient.getServiceConfig();
    const injectedConfig = serializedService.injectedEnv;
    dmnoConfigValid = serializedService.isValid;
    configItemKeysAccessed = {};

    // shows nicely formatted errors in the terminal
    ConfigServerClient.checkServiceIsValid(serializedService);

    injectionResult = injectDmnoGlobals({
      injectedConfig,
      trackingObject: configItemKeysAccessed,
    });
  }

  // We may want to fetch via the CLI instead - it would be slightly faster during a build
  // however we dont know if we are in dev/build mode until later and we do need the config injected right away
  // const injectedDmnoEnv = execSync('npm exec -- dmno resolve -f json-injected').toString();
  // injectionResult = injectDmnoGlobals({ injectedConfig: JSON.parse(injectedDmnoEnv) });

  viteDefineReplacements = injectionResult.staticReplacements || {};
  dynamicItemKeys = injectionResult.dynamicKeys || [];
  publicDynamicItemKeys = injectionResult.publicDynamicKeys || [];
  sensitiveItemKeys = injectionResult.sensitiveKeys || [];
  sensitiveValueLookup = injectionResult.sensitiveValueLookup || {};
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
  const dmnoConfigClient: ConfigServerClient = (process as any).dmnoConfigClient;

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

      if (!isDevMode && !dmnoConfigValid) {
        throw new Error('DMNO config is not valid');
      }

      const serializedService = await dmnoConfigClient.getServiceConfig();
      const { staticReplacements } = injectDmnoGlobals({
        injectedConfig: serializedService.injectedEnv,
      });

      // inject rollup rewrites via config.define
      config.define = {
        ...config.define,
        ...options?.injectSensitiveConfig
          ? staticReplacements
          : _.pickBy(staticReplacements, (val, key) => key.startsWith('DMNO_PUBLIC_CONFIG.')),
      };

      if (!serializedService.isValid) {
        if (isDevMode) {
          // adjust vite's setting so it doesnt bury the error messages
          config.clearScreen = false;
        } else {
          dmnoConfigClient.shutdown();
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
        dmnoConfigClient.eventBus.on('reload', () => {
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
  };
}
