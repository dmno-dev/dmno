type DmnoGeneratedConfigSchema = {
  /** a random number! */
  readonly VITE_RANDOM_NUM?: number;
}

////////////////////////////////////////////////////////////////////////////

// example of overriding import.meta.env type (for vite specifically)
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** a random number! */
  VITE_RANDOM_NUM?: number;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

////////////////////////////////////////////////////////////////////////////

// example of overriding a dmno helper object
// could also be a method like `getDmnoConfigItem(key)`

// declare module '@dmno/core' {
//   /** resolved DMNO config */
//   export const DMNO_CONFIG: {
//     /** testing a thing */
//     readonly VITE_GLOBAL_TEST: number;
//   }
// }



////////////////////////////////////////////////////////////////////////////

// Example of using a global object - which works fine since the actual values
// are injected via rollup and rewritten

/** global obj to access your DMNO powered config */
declare var DMNO_CONFIG: DmnoGeneratedConfigSchema
