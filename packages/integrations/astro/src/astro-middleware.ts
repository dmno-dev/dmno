import 'dmno/load';
import { MiddlewareHandler } from 'astro';

const sensitiveItemKeys = (globalThis as any)._DMNO_SENSITIVE_KEYS as Array<string>;
const sensitiveValueLookup: Record<string, string> = {};
for (const itemKey of sensitiveItemKeys) {
  const val = (globalThis as any).DMNO_CONFIG[itemKey];
  if (val) sensitiveValueLookup[itemKey] = val.toString();
}


export const onRequest: MiddlewareHandler = async (context, next) => {
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
