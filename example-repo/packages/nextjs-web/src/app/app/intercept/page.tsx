import { headers } from "next/headers";

export default async function ServerTestPage() {
  headers();

  // console.log(DMNO_CONFIG.SECRET_DYNAMIC);

  // console.log('fetch.__nextPatched ?', (fetch as any).__nextPatched);
  console.log(Object.getOwnPropertyDescriptors(fetch));

  // const apiResp = await fetch('https://api.sampleapis.com/beers/ale', {
  const apiResp = await fetch('https://api.my-logging-provider.com/ingest', {
    headers: {
      'x-custom-auth': DMNO_CONFIG.STRIPE_SECRET_KEY,
      'x-another': 'bloop',
    },
  });
  const beers = await apiResp.json();
  

  return (
    <main>
      <h1>Intercept test</h1>
      <pre>{ JSON.stringify(beers) }</pre>

    </main>
  );
}
