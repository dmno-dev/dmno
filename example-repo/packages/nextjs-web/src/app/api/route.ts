// TODO: figure out where we can import this to affect API routes :(
import '@dmno/nextjs-integration';

export async function GET() {

  return Response.json({
    foo: 1, 
    publicNum: DMNO_PUBLIC_CONFIG.PUBLIC_NUM,
    secretNum: process.dmnoEnv.SECRET_NUM,

    // throws an error
    // publicError: DMNO_PUBLIC_CONFIG.ASDF,
    
    // throws an error
    // privateError: process.dmnoEnv.ASDF,
  })
}
