import '@dmno/nextjs-integration/inject';

console.log('server top of file', DMNO_CONFIG.SECRET_STATIC);

export default function ServerPage() {
  console.log('server handler fn --', DMNO_CONFIG.SECRET_STATIC);
  console.log('server handler fn --', DMNO_CONFIG.SECRET_DYNAMIC);

  return (
    <main>
      <h1>Leaked content test!</h1>

      <p>This page should fail due to leaking a secret</p>

      <p>{ DMNO_CONFIG.SECRET_STATIC }</p>
    </main>
  )
}
