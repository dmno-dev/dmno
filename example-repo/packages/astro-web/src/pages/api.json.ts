export async function GET() {
  return new Response(
    JSON.stringify({
      'public-foo': '------------------------------------------',
      'process.env.PUBLIC_FOO': process.env.PUBLIC_FOO || '_unset_',
      'import.meta.env.PUBLIC_FOO': import.meta.env.PUBLIC_FOO || '_unset_',
      'process.dmnoEnv.PUBLIC_FOO': process.dmnoEnv.PUBLIC_FOO || '_unset_',
      'import.meta.dmnoEnv.PUBLIC_FOO': import.meta.dmnoEnv.PUBLIC_FOO || '_unset_',
      'DMNO_CONFIG.PUBLIC_FOO': DMNO_CONFIG.PUBLIC_FOO || '_unset_',
      'DMNO_PUBLIC_CONFIG.PUBLIC_FOO': DMNO_PUBLIC_CONFIG.PUBLIC_FOO || '_unset_',


      'foo': '------------------------------------------',
      'process.env.FOO': process.env.FOO || '_unset_',
      'import.meta.env.FOO': import.meta.env.FOO || '_unset_',
      'process.dmnoEnv.FOO': process.dmnoEnv.FOO || '_unset_',
      'import.meta.dmnoEnv.FOO': import.meta.dmnoEnv.FOO || '_unset_',
      'DMNO_CONFIG.FOO': DMNO_CONFIG.FOO || '_unset_',
      'DMNO_PUBLIC_CONFIG.FOO': DMNO_PUBLIC_CONFIG.FOO || '_unset_',

      'secret-foo': '------------------------------------------',
      // throws with a leak detection error!
      // 'process.env.SECRET_FOO': process.env.SECRET_FOO || '_unset_',
      // 'import.meta.env.SECRET_FOO': import.meta.env.SECRET_FOO || '_unset_',
      // 'process.dmnoEnv.SECRET_FOO': process.dmnoEnv.SECRET_FOO || '_unset_',
      // 'import.meta.dmnoEnv.SECRET_FOO': import.meta.dmnoEnv.SECRET_FOO || '_unset_',
      // 'DMNO_CONFIG.SECRET_FOO': DMNO_CONFIG.SECRET_FOO || '_unset_',
      
      // ts error, throws with an error about not being public
      // 'DMNO_PUBLIC_CONFIG.SECRET_FOO': DMNO_PUBLIC_CONFIG.SECRET_FOO,
    })
  )
}
