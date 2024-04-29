import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  // TODO: spit out all public dynamic items
  return new Response(JSON.stringify({
    PUBLIC_DYNAMIC: (globalThis as any).DMNO_CONFIG.PUBLIC_DYNAMIC,
  }));
};
