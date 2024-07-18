import { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();

  // scan for leaked secrets!
  // TODO: binary file types / images / etc dont need to be checked
  const bodyText = await response.clone().text();
  (globalThis as any)._dmnoLeakScan(bodyText, { method: 'astro middleware' });
  return response;
};
