import '@dmno/nextjs-integration/inject';

console.log('secret foo = '+DMNO_CONFIG.SECRET_FOO);
console.log('secret static = '+DMNO_CONFIG.SECRET_STATIC);

export async function GET() {

  console.log('secret foo = '+DMNO_CONFIG.SECRET_FOO);
  console.log('secret static = '+DMNO_CONFIG.SECRET_STATIC);

  return Response.json({
    hi: 2, 
    PUBLIC_STATIC: DMNO_PUBLIC_CONFIG.PUBLIC_STATIC,
    PUBLIC_DYNAMIC: DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC,
    FOO: DMNO_CONFIG.FOO,
    // SECRET_FOO: DMNO_CONFIG.SECRET_FOO,
    // SECRET_STATIC: DMNO_CONFIG.SECRET_STATIC,
    
    // throws an error
    // publicError: DMNO_PUBLIC_CONFIG.ASDF,
    
    // throws an error
    // privateError: process.dmnoEnv.ASDF,
  })
}
