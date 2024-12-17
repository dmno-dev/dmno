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

const outDir = `dist/globals-injector-standalone${process.env.DMNO_EDGE_COMPAT ? '/edge' : ''}`; // Output directory

export default defineConfig({
  entry: [ // Entry point(s)
    'src/globals-injector/injector.ts', // function used to inject dmno globals
    'src/globals-injector/auto-inject.ts', // exports inject function and automatically calls it once
  ],

  esbuildPlugins: [
    addNodeImportPrefix(),
    // shakeMswInterceptorsPlugin(),
  ],

  platform: 'node',
  target: 'node20',
  // external: ['node:*'],

  noExternal: [
    // this should include all dependencies so the built files require no other dependencies
    'kleur',
  ],

  // dts: true, // Generate .d.ts files
  // minify: true, // Minify output
  // sourcemap: true, // Generate sourcemaps
  // treeshake: true, // Remove unused code

  // clean: true, // Clean output directory before building
  outDir,

  format: [ // Output format(s)
    'cjs',
    'esm',
  ], 

  splitting: false,
  keepNames: true, // stops build from prefixing our class names with `_` in some cases

  onSuccess: async () => {
    // for the edge CJS build
    // the node imports of zlib and http dont get fully tree-shaken away, so we'll just remove the lingering dead code
    if (process.env.DMNO_EDGE_COMPAT) {
      const cjsFilePath = `${__dirname}/${outDir}/injector.cjs`;
      let cjsInjectorSrc = await fs.promises.readFile(cjsFilePath, 'utf8');
      cjsInjectorSrc = cjsInjectorSrc.replace(
        `// src/lib/patch-server-response.ts\nvar import_node_zlib = __toESM(require("zlib"), 1);\nvar import_node_http = require("http");`,
        ''
      );
      await fs.promises.writeFile(cjsFilePath, cjsInjectorSrc);
    
    
    // when running netlify edge functions, it uses deno and we need a small adjustment
    } else {
    
      const filePath = `${__dirname}/${outDir}/injector.js`;
      let injectorSrc = await fs.promises.readFile(filePath, 'utf8');

      // this fixes a weird annoying issue where the current version of deno used by netlify edge functions
      // does not have `globalAgent` exported directly from node http/https, while it is part of the default export
      // so we just swap how it is imported and everything seems to work fine

      injectorSrc = injectorSrc
        // this is the code to replace when using `treeshake: true` 
  //       .replace(
  // `import http, { ClientRequest, IncomingMessage, STATUS_CODES, Agent, globalAgent as globalAgent$1 } from 'node:http';
  // import https, { Agent as Agent$1, globalAgent } from 'node:https';`,
  // `import http, { ClientRequest, IncomingMessage, STATUS_CODES, Agent } from 'node:http';
  // const globalAgent$1 = http.globalAgent;
  // import https, { Agent as Agent$1 } from 'node:https';
  // const globalAgent = https.globalAgent;`
  //       )
        // this is the code to replace without `treeshake: true` 
        .replace(
  `import {
    Agent as HttpAgent,
    globalAgent as httpGlobalAgent
  } from "node:http";
  import {
    Agent as HttpsAgent,
    globalAgent as httpsGlobalAgent
  } from "node:https";`,
  `import httpFullObj, {
    Agent as HttpAgent,
  } from "node:http";
  import httpsFullObj, {
    Agent as HttpsAgent,
  } from "node:https";
  const httpGlobalAgent = httpFullObj.globalAgent;
  const httpsGlobalAgent = httpsFullObj.globalAgent;
  `);
      await fs.promises.writeFile(filePath, injectorSrc);
    }


  },

  esbuildOptions(options, context) {
    options.define ||= {};
    options.define.__DMNO_BUILD_FOR_EDGE__ = process.env.DMNO_EDGE_COMPAT ? 'true' : 'false';
  },

});
