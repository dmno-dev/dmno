import { ConfigServerClient } from 'dmno';
import type { AstroIntegration } from 'astro';

/// initialize a dmno config server client, but only once
(process as any).dmnoConfigClient ||= new ConfigServerClient();
const dmnoConfigClient: ConfigServerClient = (process as any).dmnoConfigClient;

let dmnoEnv: Record<string, any> = {};
let sensitiveKeys: Array<string> = [];

const originalProcessEnv = structuredClone(process.env);

// console.log('dmno astro integration file loaded!');


const dmnoService = await dmnoConfigClient.getServiceConfig();
const configItemKeysAccessed: Record<string, boolean> = {};

async function injectConfig() {
  let configIsValid = true;
  // TODO: not yet sure if this logic should live here or not...
  dmnoEnv = {};
  console.log('inject config!');
  for (const itemKey in dmnoService.config) {
    const configItem = dmnoService.config[itemKey];

    // TODO: better error messaging, maybe push through to toolbar???
    if (!configItem.isValid) {
      console.log(`Config item ${itemKey} is invalid`);

      configItem.validationErrors?.forEach((error) => {
        console.log(`${error.icon} ${error.message}`);
      });

      configIsValid = false;
    } else {
      dmnoEnv[itemKey] = configItem.resolvedValue;
    }
  }

  // We attach some stuff to the locally running process / globalThis
  // which will be accessible in api endpoints (at least in dev mode)

  // feed our dmno config into process.env
  process.env = {
    ...originalProcessEnv,
  };
  for (const k in dmnoEnv) {
    process.env[k] = dmnoEnv[k]?.toString() || '';
  }

  // we cannot edit import.meta, but we've rewritten it to DMNO_CONFIG
  // (import.meta as any).dmnoEnv = dmnoEnv;
  (globalThis as any).DMNO_CONFIG = new Proxy({}, {
    get(o, key) {
      const keyStr = key.toString();
      configItemKeysAccessed[keyStr] = true;
      console.log('get DMNO_CONFIG - ', key);
      if (key in dmnoEnv) return dmnoEnv[keyStr];
      throw new Error(`❌ ${keyStr} is not a config item (1)`);
    },
  });

  // attach the same proxy object so we can throw nice errors
  (globalThis as any).DMNO_PUBLIC_CONFIG = new Proxy({}, {
    get(o, key) {
      const keyStr = key.toString();
      configItemKeysAccessed[keyStr] = true;
      console.log('get DMNO_PUBLIC_CONFIG - ', keyStr);
      if (sensitiveKeys.includes(keyStr)) {
        throw new Error(`❌ ${keyStr} is not a public config item!`);
      }
      if (key in dmnoEnv) return dmnoEnv[keyStr];
      throw new Error(`❌ ${keyStr} is not a config item (2)`);
    },
  });

  // add the full dmnoService so we can use it in the middleware to detect leaked secrets!
  (process as any).dmnoService = dmnoService;
}

await injectConfig();


type DmnoAstroIntegrationOptions = {
  /**
   * enable dynamic public config items
   * these will be fetched on page load rather than replaced in your built code
   * */
  dynamicPublicConfig: boolean,
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

        // astroOutputType = opts.config.output;
        // if (opts.command === 'build') isBuildMode = true;

        // TODO: maybe show a warning about public/dynamic and performance?
        if (dmnoIntegrationOpts?.dynamicPublicConfig && opts.config.output === 'static') {
          throw new Error('`dynamicPublicConfig` not supported when astro in static output');
        }

        sensitiveKeys = [];
        const staticConfigReplacements = {} as Record<string, string>;

        for (const itemKey in dmnoService.config) {
          const configItem = dmnoService.config[itemKey];

          if (configItem.dataType.sensitive) {
            sensitiveKeys.push(itemKey);

            // if it's sensitive and static, we'll inject only into DMNO_CONFIG
            if (!configItem.dataType.dynamic) {
              staticConfigReplacements[`DMNO_CONFIG.${itemKey}`] = JSON.stringify(configItem.resolvedValue);
            }
          } else {
            // if public and static, we'll inject into vite's rewrites
            if (!configItem.dataType.dynamic) {
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

                console.log('STATIC REPLACEMENTS', staticConfigReplacements);

                // inject rollup rewrites via config.define
                config.define = {
                  ...config.define,
                  ...staticConfigReplacements,
                };
              },

              async configureServer(server) {
                // console.log('astro vite plugin configure server');
                if (!isRestart) {
                  // let counter = 1;
                  // setInterval(() => {
                  //   (globalThis as any).DMNO_CONFIG.PUBLIC_STATIC = `static-${counter++}`;
                  //   (globalThis as any).DMNO_CONFIG.PUBLIC_DYNAMIC = `dynamic-${counter++}`;
                  // }, 1000);


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
                      console.log(src);
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


        // TODO: ideally this isn't inline text like this

        // TODO: this strategy won't quite work for actual SSR (ie output = server | hybrid)
        // inject script into SSR context

        // injectScript('page-ssr', `
        //   // during dev and build, we've already globally injected DMNO_CONFIG
        //   if (!globalThis.DMNO_CONFIG) {

        //     if (!process.env.DMNO_LOADED_ENV) {
        //       throw new Error('You must run this server via \`dmno run\`');
        //     }
        //     const dmnoEnv = JSON.parse(process.env.DMNO_LOADED_ENV);
        //     // TODO: inject back into process.dmnoEnv??

        //     globalThis.DMNO_CONFIG ||= new Proxy({}, {
        //       get(o, key) {
        //         if (key in dmnoEnv) return dmnoEnv[key].value;
        //         throw new Error(\`❌ \${key} is not a config item (3)\`);
        //       }
        //     });
        //     process.dmnoEnv = globalThis.DMNO_CONFIG;

        //     globalThis.DMNO_PUBLIC_CONFIG = new Proxy({}, {
        //       get(o, key) {
        //         if (key in dmnoEnv) {
        //           if (dmnoEnv[key].sensitive) {
        //             throw new Error(\`❌ \${key} is not public, use DMNO_CONFIG.\${key}\`);
        //           }
        //           return dmnoEnv[key].value;
        //         }
        //         throw new Error(\`❌ \${key} is not a config item (4)\`);
        //       }
        //     });
        //   }
        // `);



        // inject script into CLIENT context
        injectScript('page', [

          // fetch and load public dynamic config (if enabled)
          dmnoIntegrationOpts?.dynamicPublicConfig ? `
            const request = new XMLHttpRequest();
            request.open("GET", "/public-dynamic-config.json", false); // false means sync/blocking!
            request.send(null);

            if (request.status !== 200) {
              throw new Error('Failed to load public dynamic config');
            }
            window._DMNO_PUBLIC_DYNAMIC_CONFIG = JSON.parse(request.responseText);
            
            console.log('loaded public dynamic config', window._DMNO_PUBLIC_DYNAMIC_CONFIG);
          ` : '',

          // client side DMNO_PUBLIC_CONFIG proxy object
          `
            window._DMNO_PUBLIC_STATIC_CONFIG = window.DMNO_PUBLIC_CONFIG || {};
            console.log('public static config: ', window.DMNO_PUBLIC_CONFIG);
            window.DMNO_PUBLIC_CONFIG = new Proxy({}, {
              get(o, key) {
                ${dmnoIntegrationOpts?.dynamicPublicConfig ? `
                if (key in window._DMNO_PUBLIC_DYNAMIC_CONFIG) { // must be first
                  return window._DMNO_PUBLIC_DYNAMIC_CONFIG[key];
                } else ` : ''}if (key in window._DMNO_PUBLIC_STATIC_CONFIG) {
                  return window._DMNO_PUBLIC_STATIC_CONFIG[key];
                } else {
                  throw new Error(\`❌ \${key} is not a public config item, it may be sensitive or it may not exist at all\`);
                }
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


        if (dmnoIntegrationOpts?.dynamicPublicConfig) {
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
          if (configItem.dataType.dynamic) {
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
