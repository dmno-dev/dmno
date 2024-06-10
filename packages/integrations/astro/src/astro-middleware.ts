import { injectDmnoGlobals } from 'dmno/injector';
import { MiddlewareHandler } from 'astro';
import { patchGlobalConsoleToRedactSecrets } from 'dmno';

let sensitiveValueLookup: Record<string, { masked: string, value: string }> | undefined;
export const onRequest: MiddlewareHandler = async (context, next) => {
  if (!sensitiveValueLookup) {
    const injectionResult = injectDmnoGlobals();
    sensitiveValueLookup = injectionResult.sensitiveValueLookup;
    // @ts-ignore
    if (__DMNO_REDACT_CONSOLE__) {
      patchGlobalConsoleToRedactSecrets(sensitiveValueLookup!);
    }
  }

  // console.log(`custom astro middleware executed - ${context.url}`);
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
