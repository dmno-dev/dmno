export default function ServerPage() {
  return (
    <main>
      <h1>Server only page</h1>
      <ul>
        {/* will be rendered on the server */}
        <li>process.dmnoEnv.SECRET_NUM = {process.dmnoEnv.SECRET_NUM}</li>
        
        {/* causes an error becuse SECRET_NUM is sensitive, and not exposed on public config */}
        {/* <li>DMNO_PUBLIC_CONFIG.SECRET_NUM = {DMNO_PUBLIC_CONFIG.SECRET_NUM}</li> */}

        {/* all good! */}
        <li>DMNO_PUBLIC_CONFIG.PUBLIC_NUM = {DMNO_PUBLIC_CONFIG.PUBLIC_NUM}</li>
        
        {/* does not cause an error because the item exists, even though it is empty */}
        <li>DMNO_PUBLIC_CONFIG.EMPTY = {DMNO_PUBLIC_CONFIG.EMPTY}</li>

        {/* error because item does not exist! */}
        {/* <li>DMNO_PUBLIC_CONFIG.ASDF = {DMNO_PUBLIC_CONFIG.ASDF}</li> */}

        {/* error because item does not exist! */}
        {/* <li>process.dmnoEnv.EMPTY = {process.dmnoEnv.ASDF}</li> */}
      </ul>
    </main>
  )
}
