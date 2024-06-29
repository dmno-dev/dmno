/* eslint-disable prefer-rest-params */
import zlib from 'node:zlib';
import { ServerResponse } from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { injectDmnoGlobals } from 'dmno/injector-standalone';
import { NextConfig } from 'next';

function prependFileSync(filePath: string, textToPrepend: string) {
  const originalFileContents = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, `${textToPrepend}\n\n${originalFileContents}`);
}

// console.log(fs);



// import NextNodeServer from 'next/dist/server/next-server';


// // @ts-ignore
// const Patchable = NextImport.default;
// // console.log(NextImport.default);
// console.log(
//   Object.getOwnPropertyNames(Patchable.prototype),
//   Object.getOwnPropertySymbols(Patchable.prototype),
//   Object.getOwnPropertyDescriptors(Patchable.prototype),
//   // NextResponse.prototype.constructor,
// );
// Patchable.prototype.render404 = function () {
//   throw new Error('bloop');
// };



// class PatchedNextResponse extends NextResponse {
//   constructor(...args: Array<any>) {
//     console.log('PATCHED!');
//     super(...args);
//   }
// }
// // const oldConstructor = NextResponse.prototype.constructor;
// NextResponse.prototype.constructor = PatchedNextResponse;

const { staticReplacements, dynamicKeys, injectedDmnoEnv } = injectDmnoGlobals();

type DmnoPluginOptions = {
};

const patchedByDmnoSymbol = Symbol('patchedByDmno');
export function enableLeakDetectionByPatchingServerResponse() {
  if ((ServerResponse as any)[patchedByDmnoSymbol]) return;

  (ServerResponse as any)[patchedByDmnoSymbol] = true;

  const origFn = ServerResponse.prototype.write;

  // @ts-ignore
  ServerResponse.prototype.write = function patchedWriteFn() {
    // TODO: exclude more file types
    if (
      this.req.url.startsWith('/_next/static/')
      || this.req.url.endsWith('.ico')
    ) {
      // @ts-ignore
      return origFn.call(this, ...Array.from(arguments));
    }

    // console.log(`URL = ${this.req.url}`);
    // console.log(
    //   `PATCHED ServerResponse.write - ${this.req.url} `,
    //   // Array.from(arguments),
    // );

    const rawChunk = arguments[0];
    const compressionType = this.getHeader('Content-Encoding');

    let chunkStr;
    if (!compressionType) {
      const decoder = new TextDecoder();
      chunkStr = decoder.decode(rawChunk);
    } else if (compressionType === 'gzip') {
      // first chunk of data contains only compression headers
      if (!(this as any)._zlibHeadersChunk) {
        (this as any)._zlibHeadersChunk = rawChunk;
      } else {
        // need to append headers to each chunk in order to decompress
        const buf = Buffer.concat([(this as any)._zlibHeadersChunk, rawChunk]);
        try {
          const unzippedChunk = zlib.unzipSync(buf, {
            // flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
          });
          chunkStr = unzippedChunk.toString('utf-8');
        } catch (err) {
          // console.log('error unzipping chunk', err);
          // we get "incorrect data check" errors on some chunks, not sure why
          // but it seems the leak detection works, so we can ignore these chunks
        }
      }
    }

    if (chunkStr) {
      // TODO: probably should use a single regex
      const sensitiveLookup = (globalThis as any)._DMNO_SENSITIVE_LOOKUP;
      for (const itemKey in sensitiveLookup) {
        if (chunkStr.includes(sensitiveLookup[itemKey].value)) {
          // TODO: better error details to help user _find_ the problem
          throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM! ${itemKey}`);
        }
      }
    }

    // @ts-ignore
    // eslint-disable-next-line prefer-rest-params
    return origFn.call(this, ...Array.from(arguments));
  };
}

function enableLeakDetectionByPatchingFsWriteFile() {
  const origPromisesWriteFileFn = fs.promises.writeFile;
  fs.promises.writeFile = function dmnoPatchedWriteFile() {
    const [filePath, fileContents] = arguments;

    // naively enable/disable detection based on file extension...
    // not the best logic but it might be enough?
    // console.log('patched promises.writeFile - ', filePath);
    if (
      filePath.endsWith('.html')
      || filePath.endsWith('.rsc')
      || filePath.endsWith('.body')

    // we also need to scan .js files, but they are already built by webpack so we can't catch it here
    ) {
      const sensitiveLookup = (globalThis as any)._DMNO_SENSITIVE_LOOKUP;
      for (const itemKey in sensitiveLookup) {
        if (fileContents.includes(sensitiveLookup[itemKey].value)) {
          // TODO: better error details to help user _find_ the problem
          throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM ${itemKey} in prerendered file ${filePath}`);
        }
      }
    }

    // @ts-ignore
    return origPromisesWriteFileFn.call(this, ...Array.from(arguments));
  };
}


enableLeakDetectionByPatchingServerResponse();
enableLeakDetectionByPatchingFsWriteFile();

// we make this a function becuase we'll likely end up adding some options
export function dmnoNextConfigPlugin(dmnoOptions?: DmnoPluginOptions) {
  // nextjs doesnt have a proper plugin system, so we write a function which takes in a config object and returns an augmented one
  return (nextConfig: NextConfig): NextConfig => {
    if (nextConfig.output === 'export' && dynamicKeys.length) {
      console.error([
        'Dynamic config is not supported in static builds (next.config output="export")',
        'Set `settings.dynamicConfig` to "only_static" in your .dmno/config.mts file',
        `Dynamic config items: ${dynamicKeys.join(', ')}`,
      ].join('\n'));

      throw new Error('Dynamic config not compatible with static builds');
    }

    const injectResolvedConfigAtBuildTime = true;

    return {
      ...nextConfig,
      webpack(webpackConfig, options) {
        const { isServer } = options;

        // console.log(webpackConfig);
        // console.log(options.webpack);

        // webpack itself  is passed in so we dont have to import it...
        const webpack = options.webpack;

        // apply existing user customizations if there are any
        if (nextConfig.webpack) {
          webpackConfig = nextConfig.webpack(webpackConfig, options);
        }

        // modify entry points to inject our dmno env shim
        // (currently it is only used to help with error handling / messages)
        const originalEntry = webpackConfig.entry;
        webpackConfig.entry = async () => {
          const entries = await originalEntry();

          function injectEntry(entryKey: string, injectedPath: string) {
            if (
              entries[entryKey] && !entries[entryKey].includes(injectedPath)
            ) {
              entries[entryKey].unshift(injectedPath);
            }
          }

          // injects into server - but unfortunately this doesn't work fully
          // it doesnt get run while next is doing a build and analyzing all the routes :(
          // so for now, we'll force users to import manually
          if (isServer) {
            // console.log('server entries!', entries);

            // const injectDmnoServerFilePath = `${import.meta.dirname}/inject-dmno-server.js`;
            // injectEntry('pages/_app', injectDmnoServerFilePath);
            // injectEntry('pages/_document', injectDmnoServerFilePath);
          }

          // injects our DMNO_CONFIG shims into the client
          // which gives us nicer errors and also support for dynamic public config
          if (!isServer) {
            // console.log('client entries!', entries);
            const injectDmnoClientFilePath = `${import.meta.dirname}/inject-dmno-client.js`;
            injectEntry('main-app', injectDmnoClientFilePath);
          }

          return entries;
        };

        // Set up replacements / rewrites (using webpack DefinePlugin)
        webpackConfig.plugins.push(new webpack.DefinePlugin({
          ...staticReplacements,
        }));



        webpackConfig.plugins.push({
          apply(compiler: any) {
            // Tap into compilation hook which gives compilation as argument to the callback function
            // compiler.hooks.shouldEmit.tap('StaticLeakScanPlugin', (compilation: any) => {
            //   console.log('should emit hook', compilation);
            //   throw new Error('moo');
            //   // // Now we can tap into various hooks available through compilation
            //   // compilation.hooks.optimize.tap('HelloCompilationPlugin', () => {
            //   //   console.log('Assets are being optimized.');
            //   // });
            // });
            compiler.hooks.thisCompilation.tap('DmnoNextWebpackPlugin', (compilation: any) => {
              // compilation.hooks.processAssets.tap(
              //   {
              //     name: 'DmnoNextWebpackPlugin',
              //     stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
              //   },
              //   () => {
              //     compilation.addModule('dmno/injector-standalone', (module: any) => {
              //       console.log('added dmno standalone module');
              //     });
              //   },
              // );

              compilation.hooks.processAssets.tap(
                {
                  name: 'DmnoNextWebpackPlugin',
                  stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                },
                () => {
                  // get the file main.js
                  const webpackRuntimeAsset = compilation.getAsset('../webpack-runtime.js');
                  if (!webpackRuntimeAsset) return;

                  // create new load dmno module
                  const standaloneInjectorPath = fileURLToPath(import.meta.resolve('dmno/injector-standalone'));
                  const injectorSrc = fs.readFileSync(standaloneInjectorPath.replace('.js', '.cjs'), 'utf8');


                  compilation.updateAsset(
                    '../webpack-runtime.js',
                    (origSource: any) => {
                      console.log('updating webpack runtime', origSource);

                      // TODO: this isnt quite right
                      // sometimes it returns a cached source and then we will assume we've already patched it

                      if (!origSource._source._children) return origSource;

                      origSource._source._children.unshift(...[
                        // '(() => {',
                        'const { headers } = require("next/headers.js");',
                        injectorSrc,
                        '\n',
                        'injectDmnoGlobals({',
                        // attempts to force the route into dynamic rendering mode so it wont put our our dynamic value into a pre-rendered page
                        // however we have to wrap in try/catch because you can only call headers() within certain parts of the page... so it's not 100% foolproof
                        '  onItemAccess: (item) => {',
                        '    if (item.dynamic) { try { headers(); } catch (err) {} }',
                        '  },',

                        injectResolvedConfigAtBuildTime
                          ? `  injectedConfig: ${JSON.stringify(injectedDmnoEnv)},` : '',
                        '});',

                        // '})();',
                      ]);
                      return origSource;
                    },
                  );
                },
              );
            });


            compiler.hooks.assetEmitted.tap(
              'DmnoNextWebpackPlugin',
              (file: any, assetDetails: any) => {
                const { content, targetPath } = assetDetails;
                if (targetPath.includes('/.next/static/chunks/')) {
                  // console.log(targetPath);
                  const sensitiveLookup = (globalThis as any)._DMNO_SENSITIVE_LOOKUP;
                  for (const itemKey in sensitiveLookup) {
                    if (content.includes(sensitiveLookup[itemKey].value)) {
                      // TODO: better error details to help user _find_ the problem
                      throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM! ${itemKey} - in compiled file ${targetPath}`);
                    }
                  }


                  // console.log('asset emitted hook!', assetDetails.targetPath);
                  // console.log(targetPath, file);
                }

                // console.log(assetDetails.source, file, assetDetails.outputPath, assetDetails.targetPath);
                // const fileSrc = assetDetails.content.toString();
              },
            );
          },

        });

        // // if doing a static build, we want to scan for any leaked secrets
        // if (nextConfig.output === 'export') {
        //   // console.log(webpackConfig);
        //   webpackConfig.plugins.push(new DmnoNextWebpackPlugin());
        //   // webpackConfig.hooks.shouldEmit.tap('MyPlugin', (compilation: any) => {
        //   //   console.log(compilation);
        //   //   // return true to emit the output, otherwise false
        //   //   return true;
        //   // });
        // }

        return webpackConfig; // must return the modified config
      },
    };
  };
}
