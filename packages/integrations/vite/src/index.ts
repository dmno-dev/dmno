import { ConfigServerClient, injectDmnoGlobals } from 'dmno';
import type { Plugin } from 'vite';

let firstLoad = !(process as any).dmnoConfigClient;

/// initialize a dmno config server client, but only once
(process as any).dmnoConfigClient ||= new ConfigServerClient();
const dmnoConfigClient: ConfigServerClient = (process as any).dmnoConfigClient;

const dmnoService = await dmnoConfigClient.getServiceConfig();
// add the full dmnoService so we can use it in the middleware to detect leaked secrets!
(process as any).dmnoService = dmnoService;

const configItemKeysAccessed: Record<string, boolean> = {};
const dmnoConfigValid = ConfigServerClient.checkServiceIsValid(dmnoService);

injectDmnoGlobals(dmnoService, configItemKeysAccessed);

export function injectDmnoConfigVitePlugin(
  options: {
    /**
     * option to bundle DMNO_CONFIG as well, which will include all config items
     * should be used carefully as it could leak secrets...
     * but necessary if bundling backend code using vite
     * */
    injectPrivateConfig: boolean,
  },
): Plugin {
  const dmnoConfigClient: ConfigServerClient = (process as any).dmnoConfigClient;

  return {
    name: 'inject-dmno-config',
    async config(config, env) {
      const dmnoService = await dmnoConfigClient.getServiceConfig();

      const publicConfigInjection = {} as Record<string, string>;

      for (const itemKey in dmnoService.config) {
        const configItem = dmnoService.config[itemKey];
        if (configItem.isValid) {
          if (!configItem.dataType.sensitive) {
            publicConfigInjection[`DMNO_PUBLIC_CONFIG.${itemKey}`] = JSON.stringify(configItem.resolvedValue);
          }
          if (options?.injectPrivateConfig) {
            publicConfigInjection[`DMNO_CONFIG.${itemKey}`] = JSON.stringify(configItem.resolvedValue);
          }
        }
      }

      // inject rollup rewrites via config.define
      config.define = {
        ...config.define,
        ...publicConfigInjection,
      };

      // build mode - just need to load once
      if (env.command === 'build') {
        dmnoConfigClient.shutdown();

        if (!dmnoConfigValid) {
          console.log('');
          throw new Error('DMNO config validation failed');
        }

        // dev mode - load env, watch, and reload on changes
      } else if (env.command === 'serve') {
        // adjust vite's setting so it doesnt bury the error messages
        if (!dmnoConfigValid) config.clearScreen = false;
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
        });
      }
    },
    // handleHotUpdate({ file, server }) {
    //   console.log('hot update', file);
    // },
  };
}
