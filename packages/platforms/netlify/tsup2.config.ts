import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [ // Entry point(s)
    'src/build-plugin/injector.ts',
  ], 
  treeshake: true,
  noExternal: ["dmno/load"],
  outDir: "dist/build-plugin", // Output directory
  
  format: ['esm'], // Output format(s)
  
  splitting: false, // split output into chunks - MUST BE ON! or we get issues with multiple copies of classes and instanceof
  keepNames: true, // stops build from prefixing our class names with `_` in some cases
});
