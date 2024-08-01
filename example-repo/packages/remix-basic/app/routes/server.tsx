

export const handle = { hydrate: false };


export default function Page() {
  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">Server-only page?</h1>
      <ul className="list-disc mt-4 pl-6 space-y-2">
        <li>DMNO_CONFIG.PUBLIC_STATIC = { DMNO_CONFIG.PUBLIC_STATIC }</li>

        {/* throws because not a valid config item */}
        {/* <li>DMNO_CONFIG.SECRET_STATIC = { DMNO_CONFIG.SECRET_STATIC }</li> */}

        
        {/* throws because not a valid config item */}
        {/* <li>DMNO_PUBLIC_CONFIG.PUBLIC_STATIC = { DMNO_PUBLIC_CONFIG.BAD_KEY }</li> */}
      </ul>

      <hr/>

    </div>
  );
}
