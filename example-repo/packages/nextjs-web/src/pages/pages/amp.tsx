export const config = { amp: true }

// This gets called on every request
export async function getServerSideProps(context: any) {
  console.log('DMNO_CONFIG.SECRET_DYNAMIC = ', DMNO_CONFIG.SECRET_DYNAMIC);
  // Pass data to the page via props
  return {
    props: {
      data: context.query.leak ? DMNO_CONFIG.SECRET_DYNAMIC : DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC
    }
  };
}


function MyAmpPage(req: any) {
  const date = new Date()

  return (
    <div>
      <h1>AMP page example</h1>
      <p>Some time: {date.toJSON()}</p>
      <ul>
        <li><b>Server side data:</b> { req.data }</li>
      </ul>
    </div>
  )
}

export default MyAmpPage