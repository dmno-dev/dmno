import { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();

  // scan for leaked secrets!
  // TODO: binary file types / images / etc dont need to be checked
  const bodyText = await response.clone().text();

  const sensitiveLookup = (globalThis as any)._DMNO_SENSITIVE_LOOKUP;
  for (const itemKey in sensitiveLookup) {
    if (bodyText.includes(sensitiveLookup[itemKey].value)) {
      // TODO: better error details to help user _find_ the problem
      throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM! ${itemKey}`);
    }
  }
  return response;
};
