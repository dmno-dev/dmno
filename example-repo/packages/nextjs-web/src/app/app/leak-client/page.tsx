'use client';

export default function LeakPage() {

  return (
    <main>
      <h2>Testing CLIENT leak detection</h2>
      <p>If you uncomment the line below it should fail the build</p>
      {/* <pre>{ DMNO_CONFIG.SECRET_DYNAMIC }</pre> */}
    </main>
  );
}
