console.log('Redaction test', DMNO_CONFIG.SECRET_FOO);
console.log('Redaction test obj', { secret: DMNO_CONFIG.SECRET_FOO });
console.log('Redaction test array', ['test', DMNO_CONFIG.SECRET_FOO]);

export default function Home() {

  return (
    <main>
      <h1>use the links above</h1>
    </main>
  );
}
