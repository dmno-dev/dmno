export const dynamic = process.env.NEXT_OUTPUT_EXPORT ? 'auto' : 'force-dynamic';

export async function GET() {
  return Response.json((globalThis as any)._DMNO_PUBLIC_DYNAMIC_OBJ);
}
