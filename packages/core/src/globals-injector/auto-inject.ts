// this is an entry-point compiled by tsup
// it is meant to be imported directly by node apps as the first line to load config into DMNO_CONFIG global

import { injectDmnoGlobals as _injectDmnoGlobals } from './injector';

let defineInjectedConfig;
try {
  // we'll attempt to inject data from a global/replaced var of __DMNO_INJECTED_CONFIG__
  // this is used in something like the cloudflare dwrangler integration, where we use an esbuild replacement
  // otherwise we call injectDmnoGlobals() with nothing, and it will look for an env var `DMNO_INJECTED_ENV`
  // which would come come something like `dmno run`

  // @ts-ignore
  defineInjectedConfig = __DMNO_INJECTED_CONFIG__;
} catch (err) {}
if (defineInjectedConfig) _injectDmnoGlobals({ injectedConfig: defineInjectedConfig });
else _injectDmnoGlobals();

export const injectDmnoGlobals = _injectDmnoGlobals;

