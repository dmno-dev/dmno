import { dirname, relative } from 'path';
import { fileURLToPath } from 'url';

import _ from 'lodash-es';
import Debug from 'debug';
import { checkServiceIsValid, DmnoServer, injectDmnoGlobals } from 'dmno';
import type { Plugin } from 'vite';

import type {
  Preset,
} from '@remix-run/dev';

const debug = Debug('dmno:remix-integration');
const __dirname = dirname(fileURLToPath(import.meta.url));

let firstLoad = !(process as any).dmnoServer;

debug('dmno remix+vite plugin loaded. first load = ', firstLoad);

let isDevMode: boolean;
let dmnoHasTriggeredReload = false;
let configItemKeysAccessed: Record<string, boolean> = {};
let dmnoConfigValid = true;
let dmnoServer: DmnoServer;
let dmnoInjectionResult: ReturnType<typeof injectDmnoGlobals>;
let enableDynamicPublicClientLoading = false;

async function reloadDmnoConfig() {
  (process as any).dmnoServer ||= new DmnoServer({ watch: true });
  dmnoServer = (process as any).dmnoServer;
  const resolvedService = await dmnoServer.getCurrentPackageConfig();
  const injectedConfig = resolvedService.injectedEnv;
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

// const DYNAMIC_CONFIG_VIRTUAL_MODULE_ID = 'virtual:dmno-public-dynamic-config-api-route';


let buildDir: string;

type DmnoPluginOptions = {
  injectResolvedConfigAtBuildTime: boolean,
};

export function dmnoRemixVitePlugin(dmnoOptions?: DmnoPluginOptions) {
  const dmnoServer: DmnoServer = (process as any).dmnoServer;

  // detect if we need to build the resolved config into the output
  // which is needed when running on external platforms where we dont have ability to use `dmno run`
  const injectResolvedConfigAtBuildTime = (
    process.env.__VERCEL_BUILD_RUNNING // build running via `vercel` cli
    || process.env.NETLIFY // build running remotely on netlify
    || (process.env.NETLIFY_LOCAL && !process.env.NETLIFY_DEV) // build running locally via `netlify` cli
    || dmnoOptions?.injectResolvedConfigAtBuildTime // explicit opt-in
  );

  return {
    name: 'dmno-remix-vite-plugin',
    enforce: 'pre', // not positive this matters

    // this function will get called on each restart!
    async config(config, env) {
      // console.log('vite config hook', config, env);
      // remix loads 2 vite servers, one for frontend, one for back
      // this feels hacky to identify it but seems to be working ok
      const isBackendViteServer = (
        // during dev mode, the "mode" is only actually set to "development" on the backend s
        config.mode === 'development'
        // during build, we can use the "build.ssr" flag
        || config.build?.ssr
      );
      debug('deteced vite backend build =', isBackendViteServer);

      isDevMode = env.command === 'serve';
      buildDir = `${config.root || process.cwd()}/${config.build?.outDir}`;

      // this handles the case where astro's vite server reloaded but this file did not get reloaded
      // we need to reload if we just found out we are in dev mode - so it will use the config client
      if (dmnoHasTriggeredReload) {
        await reloadDmnoConfig();
        dmnoHasTriggeredReload = false;
      }

      // inject rollup rewrites via config.define
      // we have to filter out existing DMNO entries, or else we'd have config items stay
      // even after removed from our config schema
      const existingDefineWithoutDmnoEntries = Object.fromEntries(
        Object.entries(config.define || {})
          .filter((k) => !k[0].match(/DMNO_(PUBLIC_)?CONFIG\./)),
      );
      config.define = {
        ...existingDefineWithoutDmnoEntries,
        // always inject static DMNO_PUBLIC_CONFIG
        ...dmnoInjectionResult.staticReplacements.dmnoPublicConfig,
        // only inject static DMNO_CONFIG on the backend build
        ...isBackendViteServer && dmnoInjectionResult.staticReplacements.dmnoConfig,
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

      // TODO: should also check if we are building in totally static mode
      enableDynamicPublicClientLoading = dmnoInjectionResult.publicDynamicKeys.length > 0;

      return config;
    },
    async configureServer(server) {
      // console.log('configure server!', server.config);

      // there are 2 vite servers running, we need to trigger the reload on the non "spa" one
      if (firstLoad && server.config.command === 'serve' && server.config.appType !== 'spa') {
        firstLoad = false;
        dmnoServer.enableWatchMode(() => {
          debug('dmno config client received reload event - restarting vite server');
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          server.restart();
          dmnoHasTriggeredReload = true;
        });
      }


      // this scans server-responses in dev mode only!
      server.middlewares.use((req, res, next) => {
        // custom handle request...
        // console.log('vite server middleware!', req.url, res);

        // TODO: skip handling for more data (images, etc)
        if (req.url?.endsWith('.ico')) return next();

        // console.log('vite dev server middleware for url: ', req.url);

        const oWrite = res.write;
        res.write = function (...args) {
          const rawChunk = args[0];
          const decoder = new TextDecoder();
          const chunkStr = decoder.decode(rawChunk);
          // console.log(chunkStr);
          (globalThis as any)._dmnoLeakScan(chunkStr, { method: 'remix vite dev server middleware (ServerResponse.write)', file: req.url });
          // @ts-ignore
          return oWrite.apply(this, args);
        };

        const oEnd = res.end;
        // @ts-ignore
        res.end = function (...args) {
          let chunkStr = args[0];
          if (
            chunkStr
            && typeof chunkStr === 'string'
            // vite client env includes all static rewrites during dev mode
            // TODO: maybe can exclude them somehow?
            && !req.url?.endsWith('/vite/dist/client/env.mjs')
          ) {
            (globalThis as any)._dmnoLeakScan(chunkStr, { method: 'remix vite dev server middleware (ServerResponse.end)', file: req.url });
          }
          // @ts-ignore
          return oEnd.apply(this, args);
        };

        return next();
      });

      if (!dmnoConfigValid) {
        // triggers the built-in vite error overlay
        server.middlewares.use((req, res, next) => {
          server.hot.send({
            type: 'error',
            err: {
              plugin: 'DMNO',
              message: 'Your config is currently invalid - check your terminal for more details',
              stack: '',
            },
          });
          return next();
        });
      }
    },

    renderChunk(code, chunk, options, meta) {
      if (dmnoInjectionResult.serviceSettings.preventClientLeaks) {
        // scan all "client" chunks for secrets
        if (options.dir?.endsWith('/build/client')) {
          // TODO: add more metadata
          (globalThis as any)._dmnoLeakScan(code, {
            method: 'remix vite client chunk scan',
            file: chunk.fileName,
          });
        }
      }
    },

    // leak detection in _built_ files
    transform(src, id) {
      console.log(`transform - ${id}`);
      // inject server-side code here - either into the user-provided `entry.server.tsx` or a default file like `entry.server.node.tsx`
      if (id.match(/\/entry\.server(\.[a-z]+)?\.[jt]sx/)) {
        // note - can also patch '\0virtual:remix/server-build'
        return [
          // 'console.log(\'>>> injected server dmno code <<<\');',

          'import { injectDmnoGlobals } from "dmno/inject-globals";',

          // call the globals injector
          // and inject the resolved config values if we are building for netlify/vercel/etc
          'injectDmnoGlobals({',
          injectResolvedConfigAtBuildTime ? `injectedConfig: ${JSON.stringify(dmnoInjectionResult.injectedDmnoEnv)},` : '',
          '});',

          src,
        ].join('\n');
      }

      if (
      // `/entry.client.tsx` would seem like the appropriate place,
      // but it is not actually loaded first, so we dont get DMNO_CONFIG available in calls at the top level of routes
      // and is also not effective in both dev and built code

        // this works for "built" code
        id.endsWith('/node_modules/react/jsx-runtime.js')

        // this works during local dev
        || id.endsWith('/node_modules/vite/dist/client/env.mjs')
      ) {
        return [
          // original source - must be first, because in the vite env case, it has already injected the static config from the define plugin
          src,

          // 'console.log(\'>>> injected CLIENT dmno code <<<\');',

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
                  request.open("GET", "/_dmno-public-dynamic-config", false); // false means sync/blocking!
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
                if (${JSON.stringify(dmnoInjectionResult.publicDynamicKeys)}.includes(key)) {
                  throw new Error(\`❌ Unable to access dynamic config item \\\`\${key}\\\` in "static" output mode\`);
                }
          `, // TODO: tailor message above to remix's static mode

          // in dev mode, we'll give a more detailed error message, letting the user know if they tried to access a sensitive or non-existant item
          isDevMode ? `
                if (${JSON.stringify(dmnoInjectionResult.sensitiveKeys)}.includes(key)) {
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
        ].join('\n');
      }

      return src;
    },

    // handleHotUpdate({ file, server }) {
    //   console.log('hot update', file);
    // },
  } satisfies Plugin;
}


export function dmnoRemixPreset() {
  return {
    name: 'dmno-remix-preset',
    remixConfig: async (args) => {
      // console.log('remixConfig!', args);
      // detect SPA mode with `ssr: false`
      if (args.remixUserConfig.ssr === false) {
        // setting `enableDynamicPublicClientLoading = false;` doesnt actually since the vite plugin already ran for the client build
        if (enableDynamicPublicClientLoading) { // only true if there are public dynamic config items in the schema
          throw new Error('Remix in SPA mode does not support any public dynamic config!');
        }
      }
      if (!enableDynamicPublicClientLoading) return {};

      return {
        // inject public dynamic config endpoint
        routes(defineRoutes) {
          return defineRoutes((route) => {
            // TODO: ideally we would use a virtual module but remix seems to be making some assumptions about a real file existing

            // instead awkwardly we need to use a relative path and need it based on the build output dir which is not available here
            const relativeRoutePath = relative(buildDir, `${__dirname}/public-dynamic-config-api-route.js`);

            route(
              '/_dmno-public-dynamic-config',
              relativeRoutePath,
              { id: '_dmno-public-dynamic-config', index: true },
            );
          });
        },
      };
    },
    // remixConfigResolved: (args) => {
    //   console.log('resolved!', args);
    //   console.log('routes!', args.remixConfig.routes);
    // },

    // remixConfigResolved: ({ remixConfig }) => {
    //   if (remixConfig.serverBundles !== serverBundles) {
    //     throw new Error('`serverBundles` was overridden!');
    //   }
    // },
  } satisfies Preset;
}


