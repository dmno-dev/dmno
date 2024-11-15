import { defineConfig } from 'tsup';

// TODO: move some of this (to `dmno/inject`?) so we can fetch replacements ready to use

// @ts-ignore
if (!process.env.DMNO_INJECTED_ENV) {
  throw new Error('You must run this via `dmno run`');
}
// @ts-ignore
const parsedLoadedEnv = JSON.parse(process.env.DMNO_INJECTED_ENV);
const replacements: Record<string, string> = {};
for (const itemKey in parsedLoadedEnv) {
  if (parsedLoadedEnv[itemKey].value === undefined) continue;
  const strValue = JSON.stringify(parsedLoadedEnv[itemKey].value);
  replacements[`DMNO_CONFIG.${itemKey}`] = strValue;
  if (!parsedLoadedEnv[itemKey].sensitive) {
    replacements[`DMNO_PUBLIC_CONFIG.${itemKey}`] = strValue;
  }
}

export default defineConfig({
  // Entry points
  entry: [ 
    'functions-src/signup.ts',
  ],
  
  sourcemap: true, // Generate sourcemaps
  treeshake: true, // Remove unused code
  clean: true, // Clean output directory before building
  outDir: "functions", // Output directory
  format: ['esm'], // Output format(s)

  // add replacements
  esbuildOptions(options, context) {
    options.define ||= {};
    options.define = {
      ...options.define,
      ...replacements,
    }
  },
});
