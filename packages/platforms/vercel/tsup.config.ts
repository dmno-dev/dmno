import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts', // preset + data types
  ], 
  dts: true,
  sourcemap: true,
  treeshake: true,
  clean: true,
  outDir: "dist",
  format: ['esm'],
  splitting: true,
  keepNames: true,
});
