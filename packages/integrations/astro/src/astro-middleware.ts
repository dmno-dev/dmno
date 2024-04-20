import { ConfigServerClient, DmnoService } from '@dmno/core';
import { MiddlewareHandler } from 'astro';

// console.log('custom astro middleware loaded!', (globalThis as any).DMNO_CONFIG, process.env);

export const onRequest: MiddlewareHandler = async (context, next) => {
  console.log(`custom astro middleware executed - ${context.url}`);

  const response = await next();

  // TODO: binary file types / images / etc dont need to be checked
  const bodyText = await response.clone().text();

  const dmnoService: Awaited<ReturnType<ConfigServerClient['getServiceConfig']>> = (process as any).dmnoService;
  for (const itemKey in dmnoService.config) {
    const configItem = dmnoService.config[itemKey];
    if (configItem.dataType.sensitive) {
      const itemValue = configItem.resolvedValue;
      if (itemValue && bodyText.includes(itemValue.toString())) {
        // TODO: better error details to help user find the problem
        throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM! ${itemKey}`);
      }
    }
  }
};
