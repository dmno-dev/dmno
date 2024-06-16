// export const prerender = true;

export async function GET() {
  // this request should be intercepted because of the sensitive secret being sent to the wrong domain
  const apiResp = await fetch('https://api.sampleapis.com/beers/ale', {
    headers: {
      'x-custom-auth': DMNO_CONFIG.SECRET_FOO,
      'x-another': 'bloop',
    },
  });
  return new Response(JSON.stringify(await apiResp.json()));
}
