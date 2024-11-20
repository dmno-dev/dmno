/* eslint-disable prefer-rest-params */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { injectDmnoGlobals } from 'dmno/injector-standalone';

import next from 'next';
import type { NextConfig } from 'next';

const __dirname = dirname(fileURLToPath(import.meta.url));


const {
  staticReplacements, dynamicKeys, injectedDmnoEnv, serviceSettings,
} = injectDmnoGlobals();

type DmnoPluginOptions = {
  injectResolvedConfigAtBuildTime: boolean,
};

export type NextConfigFunction = (
  phase: string,
  defaults: { defaultConfig: NextConfig },
) => NextConfig | PromiseLike<NextConfig>;


function patchFsWriteFileToPreventClientLeaks() {
  const origPromisesWriteFileFn = fs.promises.writeFile;
  fs.promises.writeFile = function dmnoPatchedWriteFile() {
    const [filePath, fileContents] = arguments;

    // naively enable/disable detection based on file extension... probably not the best logic but it might be enough?
    if (
      filePath.endsWith('.html')
      || filePath.endsWith('.rsc')
      || filePath.endsWith('.body')
      // we also need to scan .js files, but they are already built by webpack so we can't catch it here
    ) {
      // TODO: better error details to help user _find_ the problem
      (globalThis as any)._dmnoLeakScan(fileContents, { method: 'nextjs fs.writeFile', file: filePath });
    }

    // @ts-ignore
    return origPromisesWriteFileFn.call(this, ...Array.from(arguments));
  };
}

const WEBPACK_PLUGIN_NAME = 'DmnoNextWebpackPlugin';

function getCjsModuleSource(moduleName: string) {
  const modulePath = fileURLToPath(import.meta.resolve(moduleName)).replace('.js', '.cjs');
  const moduleSrc = fs.readFileSync(modulePath, 'utf8');
  return moduleSrc;
}

// we make this a function becuase we'll likely end up adding some options
export function dmnoNextConfigPlugin(dmnoOptions?: DmnoPluginOptions) {
  if (serviceSettings?.preventClientLeaks) {
    // patches fs.writeFile to scan files output by next itself for leaks
    // (does not include files output during webpack build)
    patchFsWriteFileToPreventClientLeaks();
  }


  // detect if we need to build the resolved config into the output
  // which is needed when running on external platforms where we dont have ability to use `dmno run`
  const injectResolvedConfigAtBuildTime = (
    process.env.__VERCEL_BUILD_RUNNING // build running via `vercel` cli
    || process.env.NETLIFY // build running remotely on netlify
    || (process.env.NETLIFY_LOCAL && !process.env.NETLIFY_DEV) // build running locally via `netlify` cli
    || dmnoOptions?.injectResolvedConfigAtBuildTime // explicit opt-in
  );

  // nextjs doesnt have a proper plugin system, so we write a function which takes in a config object and returns an augmented one
  return (nextConfig: NextConfig | NextConfigFunction): NextConfigFunction => {
    return async (phase: string, defaults: { defaultConfig: NextConfig }) => {
      let resolvedNextConfig: NextConfig;
      if (typeof nextConfig === 'function') {
        const nextConfigFnResult = nextConfig(phase, defaults);
        resolvedNextConfig = await nextConfigFnResult;
      } else {
        resolvedNextConfig = nextConfig;
      }

      if (resolvedNextConfig.output === 'export' && dynamicKeys.length) {
        console.error([
          'Dynamic config is not supported in static builds (next.config output="export")',
          'Set `settings.dynamicConfig` to "only_static" in your .dmno/config.mts file',
          `Dynamic config items: ${dynamicKeys.join(', ')}`,
        ].join('\n'));

        throw new Error('Dynamic config not compatible with static builds');
      }

      return {
        ...resolvedNextConfig,
        webpack(webpackConfig, options) {
          const { isServer } = options;

          // webpack itself  is passed in so we dont have to import it...
          const webpack = options.webpack;

          // apply existing user customizations if there are any
          if (resolvedNextConfig.webpack) {
            webpackConfig = resolvedNextConfig.webpack(webpackConfig, options);
          }

          // modify entry points to inject our dmno env shim
          // currently this strategy only works for injecting into the client
          const originalEntry = webpackConfig.entry;
          webpackConfig.entry = async () => {
            const entries = await originalEntry();

            function injectEntry(entryKey: string, injectedPath: string) {
              if (
                entries[entryKey]
              ) {
                if (!Array.isArray(entries[entryKey])) {
                  entries[entryKey] = [entries[entryKey]];
                }
                if (!entries[entryKey].includes(injectedPath)) {
                  entries[entryKey].unshift(injectedPath);
                }
              }
            }

            // injecting into server entries does not seem to work in all situations :(
            // if (isServer) console.log('server entries!', entries);

            // injects our DMNO_CONFIG shims into the client
            // which gives us nicer errors and also support for dynamic public config
            if (!isServer) {
              const injectDmnoClientFilePath = `${__dirname}/inject-dmno-client.js`;
              injectEntry('main-app', injectDmnoClientFilePath);
              injectEntry('main', injectDmnoClientFilePath);
              injectEntry('amp', injectDmnoClientFilePath);
            }

            return entries;
          };

          // Set up replacements / rewrites (using webpack DefinePlugin)
          webpackConfig.plugins.push(new webpack.DefinePlugin({
            ...staticReplacements.dmnoPublicConfig,
            ...isServer && staticReplacements.dmnoConfig,
          }));

          // updates the webpack source to inject dmno global logic and call it
          // we run this on the runtimes for serverless and edge
          function updateServerRuntimeToInjectDmno(edgeRuntime = false) {
            return function (origSource: any) {
              const origSourceStr = origSource.source();

              // we will inline the injector code, but need a different version if we are running in the edge runtime
              const injectorSrc = getCjsModuleSource(`dmno/injector-standalone${edgeRuntime ? '/edge' : ''}`);

              const updatedSourceStr = [
                // we use `headers()` to force next into dynamic rendering mode, but on the edge runtime it's always dynamic
                // (see below for where headers is used)
                !edgeRuntime ? 'const { headers } = require("next/headers");' : '',

                // code built for edge runtime does not have `module.exports` or `exports` but we are inlining some already built common-js code
                // so we just create them. It's not needed since it is inlined and we call the function right away
                edgeRuntime ? 'const module = { exports: {} }; const exports = {}' : '',

                // inline the dmno injector code and then call it
                injectorSrc,
                'injectDmnoGlobals({',
                injectResolvedConfigAtBuildTime ? `injectedConfig: ${JSON.stringify(injectedDmnoEnv)},` : '',

                // attempts to force the route into dynamic rendering mode so it wont put our our dynamic value into a pre-rendered page
                // however we have to wrap in try/catch because you can only call headers() within certain parts of the page... so it's not 100% foolproof
                !edgeRuntime ? `
                  onItemAccess: async (item) => {
                    if (item.dynamic) {
                      try { headers(); }
                      catch (err) {}
                    }
                  },` : '',
                '});',

                origSourceStr,
              ].join('\n');

              return new webpack.sources.RawSource(updatedSourceStr);
            };
          }


          // we need to inject the dmno globals injector and call it
          // and in vercel/netlify etc where we can't run via `dmno run` we need to inject the resolved config into the build
          // not sure if this is the best way, but injecting into the `webpack-runtime.js` file seems to run everywhere
          webpackConfig.plugins.push({
            apply(compiler: any) {
              compiler.hooks.thisCompilation.tap(WEBPACK_PLUGIN_NAME, (compilation: any) => {
                compilation.hooks.processAssets.tap(
                  {
                    name: WEBPACK_PLUGIN_NAME,
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                  },
                  () => {
                    // not sure why, but these paths are different in build vs dev
                    if (compilation.getAsset('webpack-runtime.js')) {
                      compilation.updateAsset('webpack-runtime.js', updateServerRuntimeToInjectDmno());
                    }
                    if (compilation.getAsset('../webpack-runtime.js')) {
                      compilation.updateAsset('../webpack-runtime.js', updateServerRuntimeToInjectDmno());
                    }
                    if (compilation.getAsset('webpack-api-runtime.js')) {
                      compilation.updateAsset('webpack-api-runtime.js', updateServerRuntimeToInjectDmno());
                    }
                    if (compilation.getAsset('../webpack-api-runtime.js')) {
                      compilation.updateAsset('../webpack-api-runtime.js', updateServerRuntimeToInjectDmno());
                    }

                    if (compilation.getAsset('edge-runtime-webpack.js')) {
                      compilation.updateAsset('edge-runtime-webpack.js', updateServerRuntimeToInjectDmno(true));
                    }
                  },
                );
              });

              // add webpack hook to handle leaks in 'use client' pages
              // since this ends up in a built js file instead of a server response
              if (serviceSettings?.preventClientLeaks) {
                // scan built js files
                compiler.hooks.assetEmitted.tap(
                  WEBPACK_PLUGIN_NAME,
                  (file: any, assetDetails: any) => {
                    const { content, targetPath } = assetDetails;

                    if (targetPath.includes('/.next/static/chunks/')) {
                      // NOTE - in dev mode the request hangs on the error, but the console error should help
                      // and during a build, it will actually fail the build
                      (globalThis as any)._dmnoLeakScan(content, {
                        method: 'nextjs webpack plugin - static chunks',
                        file: targetPath,
                      });
                    }
                  },
                );
              }
            },
          });

          return webpackConfig; // must return the modified config
        },
      };
    };
  };
}
