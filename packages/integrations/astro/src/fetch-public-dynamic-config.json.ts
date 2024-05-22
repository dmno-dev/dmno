import type { APIRoute } from 'astro';

// dmno globals are already injected so we can just access them as needed
const publicDynamicKeys = (globalThis as any)._DMNO_PUBLIC_DYNAMIC_KEYS as Array<string>;

export const GET: APIRoute = async ({ params, request }) => {
  const publicDynamicEnvObj: Record<string, string> = {};
  for (const itemKey of publicDynamicKeys) {
    publicDynamicEnvObj[itemKey] = (globalThis as any).DMNO_PUBLIC_CONFIG[itemKey];
  }
  return new Response(JSON.stringify(publicDynamicEnvObj));
};
