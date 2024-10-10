import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [ // Entry point(s)
    'src/index.ts', // main lib, users will import from here
  ], 

  // imported as TS directly, so we have to tell tsup to compile it instead of leaving it external
  noExternal: [
    '@dmno/ts-lib', '@dmno/encryption-lib',
  ],
  external: [
    // '@dmno/configraph'
  ],

  dts: true, // Generate .d.ts files
  // minify: true, // Minify output
  sourcemap: true, // Generate sourcemaps
  treeshake: true, // Remove unused code
  
  // clean: true, // Clean output directory before building
  outDir: "dist", // Output directory
  
  format: ['esm'], // Output format(s)
  
  splitting: true, // split output into chunks - MUST BE ON! or we get issues with multiple copies of classes and instanceof
  keepNames: true, // stops build from prefixing our class names with `_` in some cases
});