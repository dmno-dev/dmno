export const prerender = true;

export async function GET() {
  
  console.log(DMNO_CONFIG.SECRET_STATIC);
  console.log(DMNO_CONFIG.SECRET_FOO);
  

  return new Response(
    JSON.stringify({
      "DMNO_PUBLIC_CONFIG.PUBLIC_STATIC": DMNO_PUBLIC_CONFIG.PUBLIC_STATIC,
      "DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC": DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC,

      "DMNO_CONFIG.PUBLIC_STATIC": DMNO_CONFIG.PUBLIC_STATIC,
      "DMNO_CONFIG.PUBLIC_DYNAMIC": DMNO_CONFIG.PUBLIC_DYNAMIC,
      // "DMNO_CONFIG.SECRET_STATIC": DMNO_CONFIG.SECRET_STATIC,

      'public-foo': '------------------------------------------',
      'process.env.PUBLIC_FOO': process.env.PUBLIC_FOO || '_unset_',
      'import.meta.env.PUBLIC_FOO': import.meta.env.PUBLIC_FOO || '_unset_',
      'DMNO_CONFIG.PUBLIC_FOO': DMNO_CONFIG.PUBLIC_FOO || '_unset_',
      'DMNO_PUBLIC_CONFIG.PUBLIC_FOO': DMNO_PUBLIC_CONFIG.PUBLIC_FOO || '_unset_',


      'foo': '------------------------------------------',
      'process.env.FOO': process.env.FOO || '_unset_',
      'import.meta.env.FOO': import.meta.env.FOO || '_unset_',
      'DMNO_CONFIG.FOO': DMNO_CONFIG.FOO || '_unset_',
      'DMNO_PUBLIC_CONFIG.FOO': DMNO_PUBLIC_CONFIG.FOO || '_unset_',

      'secret-foo': '------------------------------------------',
      // throws with a leak detection error!
      // 'process.env.SECRET_FOO': process.env.SECRET_FOO || '_unset_',
      // 'import.meta.env.SECRET_FOO': import.meta.env.SECRET_FOO || '_unset_',
      // 'DMNO_CONFIG.SECRET_FOO': DMNO_CONFIG.SECRET_FOO || '_unset_',
      
      // ts error, throws with an error about not being public
      // 'DMNO_PUBLIC_CONFIG.SECRET_FOO': DMNO_PUBLIC_CONFIG.SECRET_FOO,
    })
  )
}
