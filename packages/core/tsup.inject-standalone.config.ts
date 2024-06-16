/*
This spits out a standalone build of our globals injector which can be used by various integrations/platforms

A few very specific fixes are applied here to make things work with netlify edge functions which are running in a Deno runtime
*/

import { defineConfig } from 'tsup';
import fs from 'node:fs';



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

export default defineConfig({
  entry: [ // Entry point(s)
    'src/globals-injector/injector.ts', // function used to inject dmno globals
  ],

  esbuildPlugins: [addNodeImportPrefix()],

// imported as TS directly, so we have to tell tsup to compile it instead of leaving it external
  noExternal: [
    // this should include all dependencies so the built files require no other dependencies
    'kleur',
    '@mswjs/interceptors',
    '@mswjs/interceptors/ClientRequest',
    '@mswjs/interceptors/XMLHttpRequest',
    '@mswjs/interceptors/fetch',
  ],

  dts: true, // Generate .d.ts files
  // minify: true, // Minify output
  sourcemap: true, // Generate sourcemaps
  treeshake: true, // Remove unused code

  clean: true, // Clean output directory before building
  outDir: 'dist/globals-injector-standalone', // Output directory

  format: ['esm'], // Output format(s)

  splitting: false, // split output into chunks - MUST BE ON! or we get issues with multiple copies of classes and instanceof
  keepNames: true, // stops build from prefixing our class names with `_` in some cases

  onSuccess: async () => {
    const filePath = `${__dirname}/dist/globals-injector-standalone/injector.js`;
    const injectorSrc = await fs.promises.readFile(filePath, 'utf8');

    // this fixes a weird annoying issue where the current version of deno used by netlify edge functions
    // does not have `globalAgent` exported directly from node http/https, while it is part of the default export
    // so we just swap how it is imported and everything seems to work fine

    const fixedSrc = injectorSrc.replace(`import http, { ClientRequest, IncomingMessage, STATUS_CODES, Agent, globalAgent as globalAgent$1 } from 'node:http';
import https, { Agent as Agent$1, globalAgent } from 'node:https';`,
      `import http, { ClientRequest, IncomingMessage, STATUS_CODES, Agent } from 'node:http';
const globalAgent$1 = http.globalAgent;
import https, { Agent as Agent$1 } from 'node:https';
const globalAgent = https.globalAgent;`);
    await fs.promises.writeFile(filePath, fixedSrc);
  }
});
