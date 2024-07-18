/*
  This spits out a standalone build of the ServerResponse patch function, which we will inject directly into the webpack runtime code
*/

import { defineConfig } from 'tsup';

// TODO: move to published module

const NODE_BUILTIN_MODULE_REGEX = /^(assert|buffer|child_process|cluster|crypto|dgram|dns|domain|events|fs|http|https|net|os|path|punycode|querystring|readline|stream|string_decoder|timers|tls|tty|url|util|v8|vm|zlib)$/;
// plugin to add missing `node:` prefix - which is required for deno
function addNodeImportPrefix() {
	return {
		name: 'addNodeImportPrefix',
		setup(build: any) {
      build.onResolve({ filter: NODE_BUILTIN_MODULE_REGEX }, (args: any) => ({
        path: `node:${args.path}`,
        external: true,
      }))
    },
	}
}

const outDir = `dist`; // Output directory

export default defineConfig({
  entry: [ // Entry point(s)
    'src/patch-server-response.ts', // function used to patch global ServerResponse
  ],

  // esbuildPlugins: [addNodeImportPrefix()],

  dts: true, // Generate .d.ts files
  // minify: true, // Minify output
  sourcemap: true, // Generate sourcemaps
  treeshake: true, // Remove unused code

  clean: false, // Clean output directory before building
  outDir,

  format: [ // Output format(s)
    'esm',
    'cjs'
  ], 

  splitting: false,
  keepNames: true, // stops build from prefixing our class names with `_` in some cases
});
