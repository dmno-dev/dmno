import { dirname } from 'node:path';
import { fileURLToPath } from 'url';
import Debug from 'debug';
import { ConfigServerClient, injectDmnoGlobals } from 'dmno';
import type { AstroIntegration } from 'astro';

const debug = Debug('dmno:astro-integration');

debug('Loaded DMNO astro integration file');
const startLoadAt = new Date();

const __dirname = dirname(fileURLToPath(import.meta.url));

let astroCommand: 'dev' | 'build' | 'preview' | undefined;
let dmnoHasTriggeredReload = false;
let enableDynamicPublicClientLoading = false;
let configItemKeysAccessed: Record<string, boolean> = {};
let dmnoConfigValid = true;
let dynamicItemKeys: Array<string> = [];
let publicDynamicItemKeys: Array<string> = [];
let sensitiveItemKeys: Array<string> = [];
let sensitiveValueLookup: Record<string, string> = {};
let viteDefineReplacements = {} as Record<string, string>;
let dmnoConfigClient: ConfigServerClient;

async function reloadDmnoConfig() {
  let injectionResult: ReturnType<typeof injectDmnoGlobals>;
  const injectedEnvExists = (globalThis as any)._DMNO_INJECTED_ENV || globalThis.process?.env.DMNO_INJECTED_ENV;

  if (injectedEnvExists && astroCommand !== 'dev') {
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
  sensitiveValueLookup = {};
  for (const itemKey of sensitiveItemKeys) {
    const val = (globalThis as any).DMNO_CONFIG[itemKey];
    if (val) sensitiveValueLookup[itemKey] = val.toString();
  }
}

// we run this right away so the globals get injected into the astro.config file
await reloadDmnoConfig();

const loadingTime = +new Date() - +startLoadAt;
debug(`Initial dmno env load completed in ${loadingTime}ms`);

type DmnoAstroIntegrationOptions = {
  // TODO: figure out options - loading dynamic public config?
};

function dmnoAstroIntegration(dmnoIntegrationOpts?: DmnoAstroIntegrationOptions): AstroIntegration {
  return {
    name: 'dmno-astro-integration',
    hooks: {
      'astro:config:setup': async (opts) => {
        const {
          isRestart, logger, addDevToolbarApp, updateConfig,
          injectScript, addMiddleware, injectRoute,
        } = opts;
        astroCommand = opts.command;

        // this handles the case where astro's vite server reloaded but this file did not get reloaded
        // we need to reload if we just found out we are in dev mode - so it will use the config client
        if (dmnoHasTriggeredReload) {
          await reloadDmnoConfig();
          dmnoHasTriggeredReload = false;
        }

        if (!dmnoConfigValid) {
          // if we are runnign a build and config is invalid, we want to just bail
          if (opts.command === 'build') {
            // throwing an error results in a long useless stack trace, so we just exit
            console.error('💥 DMNO config validation failed 💥');
            process.exit(1);
          } else {
            // we'll let the server proceed and trigger the error overlay via HMR
          }
        }

        if (opts.config.output === 'static') {
          enableDynamicPublicClientLoading = false;
        } else {
          enableDynamicPublicClientLoading = publicDynamicItemKeys.length > 0;
        }

        updateConfig({
          vite: {
            plugins: [{
              name: 'astro-vite-plugin',
              async config(config, env) {
                debug('Injecting static replacements', viteDefineReplacements);

                // inject rollup rewrites via config.define
                config.define = {
                  ...config.define,
                  ...viteDefineReplacements,
                };
              },

              ...astroCommand === 'dev' && {
                async configureServer(server) {
                  if (!isRestart && !!dmnoConfigClient) {
                    debug('initializing dmno reload > astro restart trigger');
                    dmnoConfigClient.eventBus.on('reload', () => {
                      opts.logger.info('💫 dmno config updated - restarting astro server');
                      // eslint-disable-next-line @typescript-eslint/no-floating-promises
                      server.restart();
                      dmnoHasTriggeredReload = true;
                    });
                  }

                  // we use an HMR message which triggers the astro error overlay
                  // we use a middleware so that it will show again if the user reloads the page
                  if (!dmnoConfigValid) {
                    server.middlewares.use((req, res, next) => {
                      server.hot.send({
                        type: 'error',
                        err: {
                          name: 'Invalid DMNO config',
                          message: 'Your config is currently invalid',
                          // hint: 'check your terminal for more details',
                          stack: 'check your terminal for more details',
                          // docslink: 'https://dmno.dev/docs',
                          // cause: 'this is a cause',
                          // loc: {
                          //   file: 'file',
                          //   line: 123,
                          //   column: 456,
                          // },
                          // needs to be formatted a specific way
                          // highlightedCode: 'highlighted code goes here?',
                        },
                      });
                      return next();
                    });
                  }
                },
              },

              // leak detection in _built_ files
              transform(src, id) {
                // TODO: can probably add some rules to skip leak detection on files coming from external deps

                // skip detection if backend file
                if (id === 'astro:scripts/page-ssr.js') return src;

                for (const itemKey in sensitiveValueLookup) {
                  if (src.includes(sensitiveValueLookup[itemKey])) {
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

        // // TODO: currently we're just showing a warning, may want to throw? have more settings?
        const dynamicKeysUsedDuringPrerender = Object.keys(configItemKeysAccessed)
          .filter((k) => dynamicItemKeys.includes(k));
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
