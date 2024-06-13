/* eslint-disable prefer-rest-params */
import { injectDmnoGlobals } from 'dmno/injector';
import { MiddlewareHandler } from 'astro';

const injectionResult = injectDmnoGlobals();
let sensitiveValueLookup = injectionResult.sensitiveValueLookup;

export const onRequest: MiddlewareHandler = async (context, next) => {
  // when running in netlify functions, which is using lambdas, we need to re-inject the globals
  // we may need to re-evaluate this if we see other platforms that are also using lambdas but behave differently
  // although re-injecting should be harmless
  if (process?.env.LAMBDA_TASK_ROOT) {
    const reqInjectionResult = injectDmnoGlobals();
    sensitiveValueLookup = reqInjectionResult.sensitiveValueLookup;
  }

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
