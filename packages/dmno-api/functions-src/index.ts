export const onRequest: PagesFunction = async (context) => {
  return new Response(JSON.stringify({ apiStatus: 'ok' }), { status: 200 });
}
