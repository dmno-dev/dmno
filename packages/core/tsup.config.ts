import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true, // Generate .d.ts files
  // minify: true, // Minify output
  sourcemap: true, // Generate sourcemaps
  treeshake: true, // Remove unused code
  splitting: true, // Split output into chunks
  clean: true, // Clean output directory before building
  outDir: "dist", // Output directory
  entry: ['src/index.ts', 'src/cli.ts'], // Entry point(s)
  format: ['esm'], // Output format(s)
});