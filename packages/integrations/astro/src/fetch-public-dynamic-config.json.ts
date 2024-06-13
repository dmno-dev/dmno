import { injectDmnoGlobals } from 'dmno/injector';
import type { APIRoute } from 'astro';

// didnt think I needed to do this here... but adding it seems to resolve some issues
const injectionResult = injectDmnoGlobals();

// dmno globals are already injected so we can just access them as needed
const publicDynamicKeys = injectionResult.publicDynamicKeys;

export const GET: APIRoute = async ({ params, request }) => {
  const publicDynamicEnvObj: Record<string, string> = {};
  for (const itemKey of publicDynamicKeys) {
    publicDynamicEnvObj[itemKey] = (globalThis as any).DMNO_PUBLIC_CONFIG[itemKey];
  }
  return new Response(JSON.stringify(publicDynamicEnvObj));
};
