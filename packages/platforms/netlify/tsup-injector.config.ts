import { defineConfig } from 'tsup';

// TODO: move to published module
const NODE_BUILTIN_MODULE_REGEX = /^(assert|buffer|child_process|cluster|crypto|dgram|dns|domain|events|fs|http|https|net|os|path|punycode|querystring|readline|stream|string_decoder|timers|tls|tty|url|util|v8|vm|zlib)$/;

// plugin to add missing `node:` prefix - which is required for deno
function addNodeImportPrefix() {
	return {
		name: 'addNodeImportPrefix',
		setup(build) {
      build.onResolve({ filter: NODE_BUILTIN_MODULE_REGEX }, (args) => ({
        path: `node:${args.path}`,
        external: true,
      }))
    },
	}
}


export default defineConfig({
  entry: [ // Entry point(s)
    'src/build-plugin/injector.ts',
  ], 
  esbuildPlugins: [addNodeImportPrefix()],
  treeshake: true,
  noExternal: ["dmno/inject"],
  outDir: "dist/build-plugin", // Output directory
  
  format: ['esm'], // Output format(s)
  
  splitting: false, // split output into chunks - MUST BE ON! or we get issues with multiple copies of classes and instanceof
  keepNames: true, // stops build from prefixing our class names with `_` in some cases
});
