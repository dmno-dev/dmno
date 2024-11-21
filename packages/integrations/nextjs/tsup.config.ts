import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [ // Entry point(s)
    'src/index.ts', // main lib, users will import from here
    'src/inject-dmno-client.ts',
  ], 

  external: [
    "next",
  ],
  noExternal: [
    'dmno/inject-globals',
    'dmno/injector-standalone',
    'dmno/injector-standalone-edge',
    'dmno/patch-server-response-standalone'
  ],

  dts: true, // Generate .d.ts files
  // minify: true, // Minify output
  sourcemap: true, // Generate sourcemaps
  treeshake: true, // Remove unused code
  
  clean: false, // Clean output directory before building
  outDir: "dist", // Output directory
  
  format: ['esm', 'cjs'], // Output format(s)
  
  splitting: false,
  keepNames: true, // stops build from prefixing our class names with `_` in some cases
  shims: true,
});
