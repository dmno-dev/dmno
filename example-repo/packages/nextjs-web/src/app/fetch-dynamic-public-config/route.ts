import { publicDynamicEnvObj } from '@dmno/nextjs-integration/inject';

export const dynamic = process.env.NEXT_OUTPUT_EXPORT ? 'auto' : 'force-dynamic';

export async function GET() {
  return Response.json(publicDynamicEnvObj);
}
