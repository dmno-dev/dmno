import { injectDmnoGlobals, patchGlobalConsoleToRedactSensitiveLogs } from 'dmno/injector';
import { MiddlewareHandler } from 'astro';


const injectionResult = injectDmnoGlobals();
const sensitiveValueLookup = injectionResult.sensitiveValueLookup;
// @ts-ignore -- replaced via vite `define` config
if (__DMNO_REDACT_CONSOLE__) {
  patchGlobalConsoleToRedactSensitiveLogs();
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();

  // TODO: binary file types / images / etc dont need to be checked
  const bodyText = await response.clone().text();

  // scan for leaked secrets!
  for (const itemKey in sensitiveValueLookup) {
    if (bodyText.includes(sensitiveValueLookup[itemKey].value)) {
      // TODO: better error details to help user _find_ the problem
      throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM! ${itemKey}`);
    }
  }
};
