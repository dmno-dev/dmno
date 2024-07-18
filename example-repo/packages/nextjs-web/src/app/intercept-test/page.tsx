import '@dmno/nextjs-integration/inject';

console.log('server top of file', DMNO_CONFIG.SECRET_STATIC);

export default async function ServerPage() {
  console.log('server handler fn --', DMNO_CONFIG.SECRET_STATIC);
  console.log('server handler fn --', DMNO_CONFIG.SECRET_DYNAMIC);

  const apiResp = await fetch('https://api.sampleapis.com/beers/ale', {
    headers: {
      // secret: DMNO_CONFIG.SECRET_STATIC,
      'x-another': 'bloop',
    },
  });
  
  return (
    <main>
      <h1>Leaked http interceptor test!</h1>

      <p>This page should fail due to leaking a secret via an outbound http reqeust</p>

    </main>
  )
}
