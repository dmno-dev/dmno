/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />


declare module 'virtual:starlight/user-config' {
  const config: import('@astrojs/starlight/types').StarlightConfig;

  export default config;
}
