import '@dmno/nextjs-integration/inject';


export const dynamic = process.env.NEXT_OUTPUT_EXPORT ? 'auto' : 'force-dynamic';

export async function GET() {
  // TODO: return all dynamic config
  return Response.json({
    PUBLIC_DYNAMIC: DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC,
  })
}
