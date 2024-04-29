import { ConfigServerClient, DmnoService } from 'dmno';
import { MiddlewareHandler } from 'astro';

// console.log('custom astro middleware loaded!', (globalThis as any).DMNO_CONFIG, process.env);


// we use this file to inject code rather than `injectScript('page-ssr'`
// because page-ssr is not injected when handling api endpoints and other middlewares

const sensitiveLookup: Record<string, string> = {};
if (!(globalThis as any).DMNO_CONFIG) {
  if (!process.env.DMNO_LOADED_ENV) {
    throw new Error('You must run this server via `dmno run`');
  }
  const dmnoLoadedEnv = JSON.parse(process.env.DMNO_LOADED_ENV);
  for (const itemKey in dmnoLoadedEnv) {
    if (dmnoLoadedEnv[itemKey].sensitive && dmnoLoadedEnv[itemKey].value) {
      sensitiveLookup[itemKey] = dmnoLoadedEnv[itemKey].value.toString();
    }
  }
  console.log('sensitive values loaded: ', sensitiveLookup);

  (globalThis as any).DMNO_CONFIG = new Proxy({}, {
    get(o, key) {
      if (key in dmnoLoadedEnv) return dmnoLoadedEnv[key.toString()].value;
      throw new Error(`❌ ${key.toString()} is not a config item (ssr 1)`);
    },
  });

  // attach the same proxy object so we can throw nice errors
  (globalThis as any).DMNO_PUBLIC_CONFIG = new Proxy({}, {
    get(o, key) {
      if (key in dmnoLoadedEnv) {
        if (dmnoLoadedEnv[key.toString()].sensitive) {
          throw new Error(`❌ ${key.toString()} is not a public config item!`);
        }
        return dmnoLoadedEnv[key.toString()].value;
      }
      throw new Error(`❌ ${key.toString()} is not a config item (ssr 2)`);
    },
  });
} else {
  const dmnoService: Awaited<ReturnType<ConfigServerClient['getServiceConfig']>> = (process as any).dmnoService;
  for (const itemKey in dmnoService.config) {
    const configItem = dmnoService.config[itemKey];
    if (configItem.dataType.sensitive && configItem.resolvedValue) {
      sensitiveLookup[itemKey] = configItem.resolvedValue.toString();
    }
  }
}


export const onRequest: MiddlewareHandler = async (context, next) => {
  console.log(`custom astro middleware executed - ${context.url}`);

  const response = await next();

  // TODO: binary file types / images / etc dont need to be checked
  const bodyText = await response.clone().text();

  // scan for leaked secrets!
  for (const itemKey in sensitiveLookup) {
    if (bodyText.includes(sensitiveLookup[itemKey])) {
      // TODO: better error details to help user _find_ the problem
      throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM! ${itemKey}`);
    }
  }
};
