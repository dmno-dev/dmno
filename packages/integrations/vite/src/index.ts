import _ from 'lodash-es';
import { ConfigServerClient, injectDmnoGlobals } from 'dmno';
import type { Plugin } from 'vite';

let firstLoad = !(process as any).dmnoConfigClient;

/// initialize a dmno config server client, but only once
(process as any).dmnoConfigClient ||= new ConfigServerClient();
const dmnoConfigClient: ConfigServerClient = (process as any).dmnoConfigClient;

const serializedService = await dmnoConfigClient.getServiceConfig();
// TODO: make valid check work again
// const dmnoConfigValid = ConfigServerClient.checkServiceIsValid(dmnoService);
const dmnoConfigValid = true;

injectDmnoGlobals({
  injectedConfig: serializedService.injectedEnv,
});

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
    async config(config, env) {
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

    transformIndexHtml(html) {
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
