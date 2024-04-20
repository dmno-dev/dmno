import { ConfigServerClient } from '@dmno/core';
import type { AstroIntegration } from 'astro';

const dmnoConfigClient = new ConfigServerClient();
let dmnoEnv: Record<string, any> = {};
let publicConfigInjection = {} as Record<string, string>;

const originalProcessEnv = structuredClone(process.env);

function stringifyWithUndefined(value: any, space?: number): string {
  const str = JSON.stringify(
    value,
    (_k, v) => (v === undefined ? '__DMNO_UNDEF__' : v),
    space,
  );
  return str.replaceAll('"__DMNO_UNDEF__"', 'undefined');
}

function dmnoAstroIntegration(): AstroIntegration {
  return {
    name: 'dmno-astro-integration',
    hooks: {
      'astro:config:setup': async (opts) => {
        const dmnoService = await dmnoConfigClient.getServiceConfig();

        let configIsValid = true;
        // TODO: not yet sure if this logic should live here or not...
        publicConfigInjection = {};
        dmnoEnv = {};
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

            if (!configItem.dataType.sensitive) {
              // add rollup rewrite/define for non-sensitive items
              publicConfigInjection[`DMNO_PUBLIC_CONFIG.${itemKey}`] = JSON.stringify(configItem.resolvedValue);
            }
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

        (process as any).dmnoEnv = dmnoEnv;
        // we cannot edit import.meta, but we've rewritten it to DMNO_CONFIG
        // (import.meta as any).dmnoEnv = dmnoEnv;
        (globalThis as any).DMNO_CONFIG = dmnoEnv;
        // attach the same proxy object so we can throw nice errors
        (globalThis as any).DMNO_PUBLIC_CONFIG = new Proxy({}, {
          get(o, key) {
            throw new Error(`❌ ${key.toString()} is not a public config item`);
          },
        });

        // add the full dmnoService so we can use it in the middleware to detect leaked secrets!
        (process as any).dmnoService = dmnoService;

        const {
          isRestart, logger, addDevToolbarApp, updateConfig,
          injectScript, addMiddleware,
        } = opts;


        updateConfig({
          vite: {
            plugins: [{
              name: 'astro-vite-plugin',
              async config(config, env) {
                console.log('vite plugin config!');

                // inject rollup rewrites via config.define
                config.define = {
                  ...config.define,
                  ...publicConfigInjection,
                  'import.meta.dmnoEnv': 'globalThis.DMNO_CONFIG',
                };
              },

              async configureServer(server) {
                console.log('astro vite plugin configure server');
                if (!isRestart) {
                  dmnoConfigClient.eventBus.on('reload', () => {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    server.restart();
                  });
                }
              },
            }],
          },
        });

        // console.log('adding dmno env', dmnoEnv);


        // TODO: ideally this isn't inline text like this

        // TODO: this strategy won't quite work for actual SSR (ie output = server | hybrid)
        // inject script into SSR context
        injectScript('page-ssr', `
        const _DMNO_CONFIG = ${stringifyWithUndefined(dmnoEnv)};

        globalThis.DMNO_CONFIG = new Proxy({}, {
          get(o, key) {
            if (key in _DMNO_CONFIG) return _DMNO_CONFIG[key];
            throw new Error(\`❌ \${key} is not a config item\`);
          }
        });
        process.dmnoEnv = globalThis.DMNO_CONFIG;

        globalThis.DMNO_PUBLIC_CONFIG = new Proxy({}, {
          get(o, key) {
            if (key in _DMNO_CONFIG) {
              throw new Error(\`❌ \${key} is not public, use DMNO_CONFIG.\${key} instead\`);  
            }
            throw new Error(\`❌ \${key} is not a config item\`);
          }
        });
        `);


        // inject script into CLIENT context
        injectScript('page', `
        window.DMNO_CONFIG = new Proxy({}, {
          get(o, key) {
            throw new Error(\`❌ You cannot access DMNO_CONFIG on the client, use DMNO_PUBLIC_CONFIG.\${key} instead \`);
          }
        });

        const _DMNO_PUBLIC_CONFIG = DMNO_PUBLIC_CONFIG;
        window.DMNO_PUBLIC_CONFIG = new Proxy(_DMNO_PUBLIC_CONFIG, {
          get(o, key) {
            if (key in _DMNO_PUBLIC_CONFIG) return _DMNO_PUBLIC_CONFIG[key];
            throw new Error(\`❌ \${key} is not a public config item, it may be sensitive or it may not exist at all\`);
          }
        });
        `);

        // these use the _already built_ files

        // add leak detection middleware!
        addMiddleware({
          entrypoint: `${import.meta.dirname}/astro-middleware.mjs`,
          order: 'pre',
        });

        // enable the toolbar (currently does nothing...)
        addDevToolbarApp(`${import.meta.dirname}/dev-toolbar-app.mjs`);
      },
    },
  };
}

export default dmnoAstroIntegration;
