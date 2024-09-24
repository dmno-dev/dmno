import { dirname } from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';
import Debug from 'debug';
import {
  ConfigServerClient, injectDmnoGlobals,
} from 'dmno';
import type { AstroIntegration } from 'astro';

const debug = Debug('dmno:astro-integration');

debug('Loaded DMNO astro integration file');
const startLoadAt = new Date();

const __dirname = dirname(fileURLToPath(import.meta.url));

let astroCommand: 'dev' | 'build' | 'preview' | 'sync' | undefined;
let dmnoHasTriggeredReload = false;
let enableDynamicPublicClientLoading = false;
let configItemKeysAccessed: Record<string, boolean> = {};
let dmnoConfigValid = true;
let dmnoConfigClient: ConfigServerClient;
let dmnoInjectionResult: ReturnType<typeof injectDmnoGlobals>;

let ssrOutputDirPath: string;
let ssrInjectConfigAtBuildTime = false;

async function reloadDmnoConfig() {
  const injectedEnvExists = globalThis.process?.env.DMNO_INJECTED_ENV;

  if (injectedEnvExists && astroCommand !== 'dev') {
    debug('using injected dmno config');
    dmnoInjectionResult = injectDmnoGlobals();
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

    dmnoInjectionResult = injectDmnoGlobals({
      injectedConfig,
      trackingObject: configItemKeysAccessed,
    });
  }

  // We may want to fetch via the CLI instead - it would be slightly faster during a build
  // however we dont know if we are in dev/build mode until later and we do need the config injected right away
  // const injectedDmnoEnv = execSync('npm exec -- dmno resolve -f json-injected').toString();
  // injectionResult = injectDmnoGlobals({ injectedConfig: JSON.parse(injectedDmnoEnv) });
}

// we run this right away so the globals get injected into the astro.config file
await reloadDmnoConfig();

const loadingTime = +new Date() - +startLoadAt;
debug(`Initial dmno env load completed in ${loadingTime}ms`);

type DmnoAstroIntegrationOptions = {
};

async function prependFile(filePath: string, textToPrepend: string) {
  const originalFileContents = await fs.promises.readFile(filePath, 'utf8');
  await fs.promises.writeFile(filePath, `${textToPrepend}\n\n${originalFileContents}`);
}


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

        // // this handles the case where astro's vite server reloaded but this file did not get reloaded
        // // we need to reload if we just found out we are in dev mode - so it will use the config client
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
          enableDynamicPublicClientLoading = dmnoInjectionResult.publicDynamicKeys.length > 0;
        }

        updateConfig({
          vite: {
            plugins: [{
              name: 'astro-vite-plugin',
              async config(config, env) {
                debug('Injecting static replacements', dmnoInjectionResult.staticReplacements);

                // console.log('vite config hook', config, env);

                // inject rollup rewrites via config.define
                config.define = {
                  ...config.define,
                  // always inject public static replacements
                  ...dmnoInjectionResult.staticReplacements.dmnoPublicConfig,
                  // only inject sensitive static replacements when building SSR code
                  ...config.build?.ssr && dmnoInjectionResult.staticReplacements.dmnoConfig,
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
                if (!dmnoInjectionResult.serviceSettings.preventClientLeaks) {
                  return src;
                }

                // TODO: can probably add some rules to skip leak detection on files coming from external deps

                // skip detection if injected ssr (backend) script
                if (id === 'astro:scripts/page-ssr.js') return src;

                // TODO: better error details to help user find the problem
                (globalThis as any)._dmnoLeakScan(src, { method: 'astro vite plugin', file: id });
                return src;
              },
            }],
          },
        });

        // injectScript('page-ssr', [
        //   'console.log(\'PAGE-SSR-INJECTED SCRIPT\');',
        // ].join('\n'));

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
                if (${JSON.stringify(dmnoInjectionResult.publicDynamicKeys)}.includes(key)) {
                  throw new Error(\`❌ Unable to access dynamic config item \\\`\${key}\\\` in Astro "static" output mode\`);
                }
          `,

          // in dev mode, we'll give a more detailed error message, letting the user know if they tried to access a sensitive or non-existant item
          astroCommand === 'dev' ? `
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
        ].join('\n'));


        if (enableDynamicPublicClientLoading) {
          injectRoute({
            pattern: 'public-dynamic-config.json',
            // Use relative path syntax for a local route.
            entrypoint: `${__dirname}/fetch-public-dynamic-config.json.js`,
          });
        }

        if (dmnoInjectionResult.serviceSettings.preventClientLeaks) {
          // add leak detection middleware!
          addMiddleware({
            entrypoint: `${__dirname}/astro-middleware.js`,
            order: 'post', // not positive on this?
          });
        }

        // enable the toolbar (currently does nothing...)
        addDevToolbarApp(`${__dirname}/dev-toolbar-app.js`);
      },

      'astro:config:done': async (opts) => {
        ssrOutputDirPath = opts.config.build.server.pathname;


        // currently we only trigger this behaviour for the netlify adapter, but we may also enable it via an explicit option
        ssrInjectConfigAtBuildTime = [
          '@astrojs/netlify',
          '@astrojs/vercel/serverless',
        ].includes(opts.config.adapter?.name || '');
      },

      'astro:build:ssr': async (opts) => {
        // console.log('build:ssr', opts);

        if (!ssrOutputDirPath) throw new Error('Did not set ssr output path');

        // For the netlify adapter (and posibly others in the future), we need to inject the resolved config at build time
        // because we don't have control over how the server side code is run (ie cannot use `dmno run`)
        // also the nature of how functions and edge functions are run on lamdbas and deno
        // mean we need some extra calls to re-patch globals for log redaction and http interception
        if (ssrInjectConfigAtBuildTime) {
          // first we'll create a new file which includes the code that injects dmno globals and other global patching behaviour
          // but we'll add the actual resolved config values so we dont need to inject them on boot
          const standaloneInjectorPath = fileURLToPath(import.meta.resolve('dmno/injector-standalone'));
          const injectorSrc = await fs.promises.readFile(standaloneInjectorPath, 'utf8');

          const builtSsrInjectorPath = `${ssrOutputDirPath}inject-dmno-config.mjs`;
          await fs.promises.writeFile(
            builtSsrInjectorPath,
            [
              injectorSrc,
              '// INJECTED BY @dmno/astro-integration -----',
              'if (!globalThis._injectDmnoGlobals) {',
              '  globalThis._injectDmnoGlobals = injectDmnoGlobals;',
              `  injectDmnoGlobals({ injectedConfig: ${JSON.stringify(dmnoInjectionResult.injectedDmnoEnv)} });`,
              '}',
            ].join('\n'),
          );

          for (const entryModuleKey in opts.manifest.entryModules) {
            // console.log('entry module - ', entryModuleKey);

            const entryPath = opts.manifest.entryModules[entryModuleKey];
            if (!entryPath) continue;
            const fullEntryPath = `${ssrOutputDirPath}${entryPath}`;

            try {
              await prependFile(fullEntryPath, [
                // main entry needs the dmno config import
                [
                  '\0@astrojs-ssr-virtual-entry',
                  '\0astro-internal:middleware',
                ].includes(entryModuleKey) ? "import './inject-dmno-config.mjs';" : '',
                '',

                // every other entry file needs to re-call the injector
                // ideally we wouldnt need this, but it is needed with the way the lambdas are set up
                // (we also skip a few internal files)
                [
                  '\0@astro-renderers',
                  '\0@astrojs-manifest',
                ].includes(entryModuleKey) ? '' : `
                  try { globalThis._injectDmnoGlobals(); }
                  catch (err) { console.log('error injecting globals', err); }
                `,


              ].join('\n'));
            } catch (err) {
              // manifest file is in the list but does not exist
            }
          }

          if (opts.middlewareEntryPoint) {
            const middlewareEntryPath = fileURLToPath(opts.middlewareEntryPoint);
            await prependFile(middlewareEntryPath, [
              "import './inject-dmno-config.mjs';",
            ].join('\n'));
          }

        // when building for the node adapter, we only need to inject importing the globals injector and trigger it once
        } else if (opts.manifest.entryModules['\x00@astrojs-ssr-virtual-entry']) {
          const entryPath = ssrOutputDirPath + opts.manifest.entryModules['\x00@astrojs-ssr-virtual-entry'];
          await prependFile(entryPath, "import 'dmno/auto-inject-globals';");
        }
        // when building a static build, we dont need to do anything, since we've already injected it in the process
      },
      'astro:build:done': async (opts) => {
        // if we didn't actually pre-render any pages, we can move one
        // (this would be the case in output=server mode with no `prerender` pages
        if (!opts.pages.length) return;

        // otherwise, we want to check which config was used during prerendering
        // so if any were expected to be dyanmic (ie loaded at boot time) we can throw/warn
        // TODO: currently we're just showing a warning, may want to throw? have more settings?
        const dynamicKeysUsedDuringPrerender = Object.keys(configItemKeysAccessed)
          .filter((k) => dmnoInjectionResult.dynamicKeys.includes(k));
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
