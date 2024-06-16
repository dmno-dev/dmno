import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  const publicDynamicEnvObj: Record<string, string> = {};
  for (const itemKey of (globalThis as any)._DMNO_PUBLIC_DYNAMIC_KEYS) {
    publicDynamicEnvObj[itemKey] = (globalThis as any).DMNO_PUBLIC_CONFIG[itemKey];
  }
  return new Response(JSON.stringify(publicDynamicEnvObj));
};
