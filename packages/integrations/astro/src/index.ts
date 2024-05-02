import { ConfigServerClient, injectDmnoGlobals } from 'dmno';
import type { AstroIntegration } from 'astro';

// console.log('dmno astro integration file loaded!');


/// initialize a dmno config server client, but only once
(process as any).dmnoConfigClient ||= new ConfigServerClient();
const dmnoConfigClient: ConfigServerClient = (process as any).dmnoConfigClient;

const dmnoService = await dmnoConfigClient.getServiceConfig();
// add the full dmnoService so we can use it in the middleware to detect leaked secrets!
(process as any).dmnoService = dmnoService;

const configItemKeysAccessed: Record<string, boolean> = {};
const dmnoConfigValid = ConfigServerClient.checkServiceIsValid(dmnoService);

injectDmnoGlobals(dmnoService, configItemKeysAccessed);

let enableDynamicPublicClientLoading = false;

type DmnoAstroIntegrationOptions = {
  // TODO: figure out options - loading dynamic public config?
};

function dmnoAstroIntegration(dmnoIntegrationOpts?: DmnoAstroIntegrationOptions): AstroIntegration {
  // console.log('dmno astro integration initialized');

  return {
    name: 'dmno-astro-integration',
    hooks: {
      'astro:config:setup': async (opts) => {
        const {
          isRestart, logger, addDevToolbarApp, updateConfig,
          injectScript, addMiddleware, injectRoute,
        } = opts;

        if (opts.command === 'build' && !dmnoConfigValid) {
          throw new Error('DMNO config is not valid');
        }

        if (opts.config.output === 'static') {
          enableDynamicPublicClientLoading = false;
        } else {
          const hasPublicDynamicConfig = Object.values(dmnoService.config)
            .find((i) => !i.dataType.sensitive && i.isDynamic);
          enableDynamicPublicClientLoading = !!hasPublicDynamicConfig;
        }

        const staticConfigReplacements = {} as Record<string, string>;

        for (const itemKey in dmnoService.config) {
          const configItem = dmnoService.config[itemKey];

          if (configItem.dataType.sensitive) {
            // if it's sensitive and static, we'll inject only into DMNO_CONFIG
            if (!configItem.isDynamic) {
              staticConfigReplacements[`DMNO_CONFIG.${itemKey}`] = JSON.stringify(configItem.resolvedValue);
            }
          } else {
            // if public and static, we'll inject into vite's rewrites
            if (!configItem.isDynamic) {
              // add rollup rewrite/define for non-sensitive items
              staticConfigReplacements[`DMNO_PUBLIC_CONFIG.${itemKey}`] = JSON.stringify(configItem.resolvedValue);
              staticConfigReplacements[`DMNO_CONFIG.${itemKey}`] = JSON.stringify(configItem.resolvedValue);
            }
          }
        }

        updateConfig({
          vite: {
            plugins: [{
              name: 'astro-vite-plugin',
              async config(config, env) {
                // console.log('vite plugin config!');

                // console.log('STATIC REPLACEMENTS', staticConfigReplacements);

                // inject rollup rewrites via config.define
                config.define = {
                  ...config.define,
                  ...staticConfigReplacements,
                };
              },

              async configureServer(server) {
                // console.log('astro vite plugin configure server');
                if (!isRestart) {
                  dmnoConfigClient.eventBus.on('reload', () => {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    server.restart();
                  });
                }
              },

              // leak detection in built files
              transform(src, id) {
                // TODO: can probably add some rules to skip leak detection on files coming from external deps

                // console.log('vite plugin transform - ', id);

                // skip detection if backend file
                if (id === 'astro:scripts/page-ssr.js') return src;

                const dmnoService: Awaited<ReturnType<ConfigServerClient['getServiceConfig']>> = (process as any).dmnoService;
                for (const itemKey in dmnoService.config) {
                  const configItem = dmnoService.config[itemKey];
                  if (configItem.dataType.sensitive) {
                    const itemValue = configItem.resolvedValue;
                    if (itemValue && src.includes(itemValue.toString())) {
                      // console.log(src);
                      // TODO: better error details to help user find the problem
                      throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM "${itemKey}" in file - ${id}`);
                    }
                  }
                }

                return src;
              },
            }],
          },
        });

        // console.log('adding dmno env', dmnoEnv);

        // inject script into CLIENT context
        injectScript('page', [
          // client side DMNO_PUBLIC_CONFIG proxy object
          // TODO: ideally we can throw a better error if we know its a dynamic item and we aren't loading dynamic stuff
          `
            window._DMNO_PUBLIC_STATIC_CONFIG = window.DMNO_PUBLIC_CONFIG || {};
            window.DMNO_PUBLIC_CONFIG = new Proxy({}, {
              get(o, key) {
                if (key in window._DMNO_PUBLIC_STATIC_CONFIG) {
                  return window._DMNO_PUBLIC_STATIC_CONFIG[key];
                }
          `,

          // if dynamic public config is enabled, we'll fetch it on-demand
          // this is fine because we only hit this block if the rewrite failed
          // (or wasnt found in the static vars during dev)
          enableDynamicPublicClientLoading ? `
                if (!window._DMNO_PUBLIC_DYNAMIC_CONFIG) {
                  const request = new XMLHttpRequest();
                  request.open("GET", "/public-dynamic-config.json", false); // false means sync/blocking!
                  request.send(null);

                  if (request.status !== 200) {
                    throw new Error('Failed to load public dynamic DMNO config');
                  }
                  window._DMNO_PUBLIC_DYNAMIC_CONFIG = JSON.parse(request.responseText);
                  
                  console.log('loaded public dynamic config', window._DMNO_PUBLIC_DYNAMIC_CONFIG);
                }
                
                if (key in window._DMNO_PUBLIC_DYNAMIC_CONFIG) {
                  return window._DMNO_PUBLIC_DYNAMIC_CONFIG[key];
                }
          ` : '',
          `     
                throw new Error(\`❌ \${key} not found in your config, it may be sensitive,${!enableDynamicPublicClientLoading ? ' could be dynamic,' : ''} or it may not exist at all\`);
              }
            });
          `,

          // DMNO_CONFIG proxy object just to give a helpful error message
          `
            window.DMNO_CONFIG = new Proxy({}, {
              get(o, key) {
                // TODO: we could make this a warning instead?
                // because it does get replaced during the build and doesn't actually harm anything
                throw new Error(\`❌ You should not access DMNO_CONFIG on the client, use DMNO_PUBLIC_CONFIG.\${key} instead \`);
              }
            });
          `,
        ].join('\n'));


        if (enableDynamicPublicClientLoading) {
          injectRoute({
            pattern: 'public-dynamic-config.json',
            // Use relative path syntax for a local route.
            entrypoint: `${import.meta.dirname}/fetch-public-dynamic-config.json.mjs`,
          });
        }

        // add leak detection middleware!
        addMiddleware({
          entrypoint: `${import.meta.dirname}/astro-middleware.mjs`,
          order: 'post', // not positive on this?
        });

        // enable the toolbar (currently does nothing...)
        addDevToolbarApp(`${import.meta.dirname}/dev-toolbar-app.mjs`);
      },
      'astro:build:done': async (opts) => {
        // if we didn't actually pre-render any pages, we can move one
        // (this would be the case in output=server mode with no `prerender` pages
        if (!opts.pages.length) return;

        // otherwise, we want to check which config was used during prerendering
        // so if any were expected to be dyanmic (ie loaded at boot time) we can throw/warn

        let dynamicConfigPrerendered = false;
        for (const itemKey in configItemKeysAccessed) {
          const configItem = dmnoService.config[itemKey];
          if (configItem.isDynamic) {
            dynamicConfigPrerendered = true;
            opts.logger.error(`Dynamic config item "${itemKey}" was used during pre-render`);
            opts.logger.error('> Change to `{ "dynamic": "false" }` to make it static');
          }
        }
        if (dynamicConfigPrerendered) {
          throw new Error('Dynamic config used during static pre-rendering');
        }
      },
    },
  };
}


export default dmnoAstroIntegration;
