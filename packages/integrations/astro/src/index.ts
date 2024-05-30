import { fileURLToPath } from 'url';
import { ConfigServerClient, injectDmnoGlobals, serializedServiceToInjectedConfig } from 'dmno';
import type { AstroIntegration } from 'astro';

// console.log('dmno astro integration file loaded!');


// initialize a dmno config server client, but only once
(process as any).dmnoConfigClient ||= new ConfigServerClient();
const dmnoConfigClient: ConfigServerClient = (process as any).dmnoConfigClient;

const __dirname = fileURLToPath(import.meta.url);

// Unsure why, but in some cases this whole file reloads, and in others it doesnt
// so we may need to reload the config multiple times
// TODO: try to clean this logic up a bit?
let dmnoService: Awaited<ReturnType<typeof dmnoConfigClient.getServiceConfig>>;
let configItemKeysAccessed: Record<string, boolean> = {};
let dmnoConfigValid = true;
let publicDynamicItemKeys: Array<string> = [];
let sensitiveItemKeys: Array<string> = [];
let sensitiveValueLookup: Record<string, string> = {};

async function reloadDmnoConfig() {
  dmnoService = await dmnoConfigClient.getServiceConfig();
  dmnoConfigValid = ConfigServerClient.checkServiceIsValid(dmnoService);
  configItemKeysAccessed = {};

  injectDmnoGlobals({
    injectedConfig: serializedServiceToInjectedConfig(dmnoService),
    trackingObject: configItemKeysAccessed,
  });
  publicDynamicItemKeys = (globalThis as any)._DMNO_PUBLIC_DYNAMIC_KEYS;
  sensitiveItemKeys = (globalThis as any)._DMNO_SENSITIVE_KEYS;
  sensitiveValueLookup = {};
  for (const itemKey of sensitiveItemKeys) {
    const val = (globalThis as any).DMNO_CONFIG[itemKey];
    if (val) sensitiveValueLookup[itemKey] = val.toString();
  }
}

// we do want to run this right away so the globals get injected into the astro.config file
await reloadDmnoConfig();


let enableDynamicPublicClientLoading = false;
let astroCommand: 'dev' | 'build' | 'preview' = 'dev';



let dmnoHasTriggeredReload = false;

type DmnoAstroIntegrationOptions = {
  // TODO: figure out options - loading dynamic public config?
};

function dmnoAstroIntegration(dmnoIntegrationOpts?: DmnoAstroIntegrationOptions): AstroIntegration {
  // console.log('dmno astro integration initialized');

  return {
    name: 'dmno-astro-integration',
    hooks: {
      'astro:config:setup': async (opts) => {
        // this handles the case where astro's vite server reloaded but this file did not get reloaded
        if (dmnoHasTriggeredReload) {
          await reloadDmnoConfig();
          dmnoHasTriggeredReload = false;
        }
        const {
          isRestart, logger, addDevToolbarApp, updateConfig,
          injectScript, addMiddleware, injectRoute,
        } = opts;

        astroCommand = opts.command;

        if (opts.command === 'build' && !dmnoConfigValid) {
          throw new Error('DMNO config is not valid');
        }

        if (opts.config.output === 'static') {
          enableDynamicPublicClientLoading = false;
        } else {
          enableDynamicPublicClientLoading = publicDynamicItemKeys.length > 0;
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
                    opts.logger.info('💫 dmno config updated - restarting astro server');
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    server.restart();
                    dmnoHasTriggeredReload = true;
                  });
                }
              },

              // leak detection in _built_ files
              transform(src, id) {
                // TODO: can probably add some rules to skip leak detection on files coming from external deps

                // console.log('vite plugin transform - ', id);

                // skip detection if backend file
                if (id === 'astro:scripts/page-ssr.js') return src;

                for (const itemKey in sensitiveValueLookup) {
                  if (src.includes(sensitiveValueLookup[itemKey])) {
                    // console.log(src);
                    // TODO: better error details to help user find the problem
                    throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM "${itemKey}" in file - ${id}`);
                  }
                }

                return src;
              },
            }],
          },
        });

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
          ` : `
                if (${JSON.stringify(publicDynamicItemKeys)}.includes(key)) {
                  throw new Error(\`❌ Unable to access dynamic config item \\\`\${key}\\\` in Astro "static" output mode\`);
                }
          `,

          // in dev mode, we'll give a more detailed error message, letting the user know if they tried to access a sensitive or non-existant item
          astroCommand === 'dev' ? `
                if (${JSON.stringify(sensitiveItemKeys)}.includes(key)) {
                  throw new Error(\`❌ \\\`DMNO_PUBLIC_CONFIG.\${key}\\\` not found - it is sensitive and must be accessed via DMNO_CONFIG on the server only\`);
                } else {
                  throw new Error(\`❌ \\\`DMNO_PUBLIC_CONFIG.\${key}\\\` not found - it does not exist in your config schema\`);  
                }
          ` : ` 
                throw new Error(\`❌ \\\`DMNO_PUBLIC_CONFIG.\${key}\\\` not found - it may be sensitive or it may not exist at all\`);
          `,
          `
              }
            });
          `,

          // DMNO_CONFIG proxy object just to give a helpful error message
          // TODO: we could make this a warning instead? because it does get replaced during the build and doesn't actually harm anything
          `
            window.DMNO_CONFIG = new Proxy({}, {
              get(o, key) {
                throw new Error(\`❌ You cannot access DMNO_CONFIG on the client, try DMNO_PUBLIC_CONFIG.\${key} instead \`);
              }
            });
          `,
        ].join('\n'));


        if (enableDynamicPublicClientLoading) {
          injectRoute({
            pattern: 'public-dynamic-config.json',
            // Use relative path syntax for a local route.
            entrypoint: `${__dirname}/fetch-public-dynamic-config.json.mjs`,
          });
        }

        // add leak detection middleware!
        addMiddleware({
          entrypoint: `${__dirname}/astro-middleware.mjs`,
          order: 'post', // not positive on this?
        });

        // enable the toolbar (currently does nothing...)
        addDevToolbarApp(`${__dirname}/dev-toolbar-app.mjs`);
      },
      'astro:build:done': async (opts) => {
        // if we didn't actually pre-render any pages, we can move one
        // (this would be the case in output=server mode with no `prerender` pages
        if (!opts.pages.length) return;

        // otherwise, we want to check which config was used during prerendering
        // so if any were expected to be dyanmic (ie loaded at boot time) we can throw/warn

        // TODO: currently we're just showing a warning, may want to throw? have more settings?
        const dynamicKeysUsedDuringPrerender = Object.keys(configItemKeysAccessed)
          .filter((k) => dmnoService.config[k].isDynamic);
        if (dynamicKeysUsedDuringPrerender.length) {
          opts.logger.warn('Dynamic config items were accessed during pre-render:');
          dynamicKeysUsedDuringPrerender.forEach((k) => {
            opts.logger.warn(`- ${k}`);
          });
          opts.logger.warn('> Change service\'s default behavior by adjusting `settings.dynamicConfig`');
          opts.logger.warn('> Or adjust individual items to `{ "dynamic": "false" }` to make them static');
          opts.logger.warn('> See https://dmno.dev/docs/guides/dynamic-config/ for more info');
        }
      },
    },
  };
}


export default dmnoAstroIntegration;
