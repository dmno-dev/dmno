import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [ // Entry point(s)
    'src/preset.ts', // preset + data types
    'src/build-plugin/index.ts',
    // 'src/build-plugin/injector.ts',
  ], 

  onSuccess: 'cp src/build-plugin/manifest.yml dist/build-plugin/manifest.yml',

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
