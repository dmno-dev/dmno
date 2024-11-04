export const runtime = 'nodejs';

console.log('server top of file', DMNO_CONFIG.SECRET_STATIC);

export default function ServerPage(req: any) {
  console.log('server handler fn --', DMNO_CONFIG.SECRET_STATIC);
  console.log('server handler fn --', DMNO_CONFIG.SECRET_DYNAMIC);

  return (
    <main>
      <h1>Server only page</h1>
      <ul>
        {/* will be rendered on the server */}
        {/* <li>DMNO_CONFIG.SECRET_STATIC = {DMNO_CONFIG.SECRET_STATIC}</li> */}
        {/* <li>DMNO_CONFIG.SECRET_FOO = {DMNO_CONFIG.SECRET_FOO}</li> */}
        
        {/* causes an error becuse SECRET_NUM is sensitive, and not exposed on public config */}
        {/* <li>DMNO_PUBLIC_CONFIG.SECRET_NUM = {DMNO_PUBLIC_CONFIG.SECRET_NUM}</li> */}

        <hr/>
        {/* all good! */}
        <li>DMNO_PUBLIC_CONFIG.PUBLIC_STATIC = {DMNO_PUBLIC_CONFIG.PUBLIC_STATIC}</li>
        <li>process.env.PUBLIC_STATIC = {process.env.PUBLIC_STATIC}</li>
        <hr/>
        <li>DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC = {DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC}</li>
        <li>process.env.PUBLIC_DYNAMIC = {process.env.PUBLIC_DYNAMIC}</li>
        <hr/>

        {/* does not cause an error because the item exists, even though it is empty */}
        <li>DMNO_PUBLIC_CONFIG.EMPTY = {DMNO_PUBLIC_CONFIG.EMPTY}</li>


        {req.searchParams.leak && <li>DMNO_CONFIG.SECRET_DYNAMIC = { DMNO_CONFIG.SECRET_DYNAMIC }</li>}

        {/* error because item does not exist! */}
        {/* <li>DMNO_PUBLIC_CONFIG.ASDF = {DMNO_PUBLIC_CONFIG.ASDF}</li> */}

        {/* error because item does not exist! */}
        {/* <li>process.dmnoEnv.EMPTY = {process.dmnoEnv.EMPTY}</li> */}
      </ul>
    </main>
  )
}
