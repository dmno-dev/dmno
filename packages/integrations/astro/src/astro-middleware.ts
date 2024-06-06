import { injectDmnoGlobals } from 'dmno/injector';
import { MiddlewareHandler } from 'astro';

let sensitiveValueLookup: Record<string, string> | undefined;
export const onRequest: MiddlewareHandler = async (context, next) => {
  if (!sensitiveValueLookup) {
    injectDmnoGlobals();
    sensitiveValueLookup = {};
    for (const itemKey of (globalThis as any)._DMNO_SENSITIVE_KEYS as Array<string>) {
      const val = (globalThis as any).DMNO_CONFIG[itemKey];
      if (val) sensitiveValueLookup[itemKey] = val.toString();
    }
  }

  // console.log(`custom astro middleware executed - ${context.url}`);

  const response = await next();

  // TODO: binary file types / images / etc dont need to be checked
  const bodyText = await response.clone().text();

  // scan for leaked secrets!
  for (const itemKey in sensitiveValueLookup) {
    if (bodyText.includes(sensitiveValueLookup[itemKey])) {
      // TODO: better error details to help user _find_ the problem
      throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM! ${itemKey}`);
    }
  }
};
