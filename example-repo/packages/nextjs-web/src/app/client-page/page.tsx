'use client'

// import '../helper';

// 🚨 leak
// console.log(DMNO_CONFIG.SECRET_STATIC);

export default function ClientPage() {

  // 🚨 leak
  // console.log(DMNO_CONFIG.SECRET_STATIC);

  return (
    <main>
      <h1>Client only page</h1>
      <ul>
        {/* renders on the server, but disappears on client and causes hydration error */}
        {/* <li>process.env.PUBLIC_STATIC = {process.env.PUBLIC_STATIC}</li> */}

        {/* gets rewritten and works - because of NEXT_PUBLIC prefix */}
        <li>process.env.NEXT_PUBLIC_STATIC = {process.env.NEXT_PUBLIC_STATIC}</li>
        
        {/* causes an error becuse SECRET_NUM is sensitive, and not exposed on public config */}
        {/* <li>DMNO_PUBLIC_CONFIG.SECRET_NUM = {DMNO_PUBLIC_CONFIG.SECRET_NUM}</li> */}
        
        {/* 🚨🚨🚨 works currently because rewrite makes it available :( */}
        {/* <li>DMNO_CONFIG.SECRET_STATIC = {DMNO_CONFIG.SECRET_STATIC}</li> */}
        {/* <li>DMNO_CONFIG.SECRET_FOO = {DMNO_CONFIG.SECRET_FOO}</li> */}

        {/* all good! */}
        <li>DMNO_PUBLIC_CONFIG.PUBLIC_STATIC = {DMNO_PUBLIC_CONFIG.PUBLIC_STATIC}</li>
        <li>DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC = {DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC}</li>
        
        {/* does not cause an error because the item exists, even though it is empty */}
        <li>DMNO_PUBLIC_CONFIG.EMPTY = {DMNO_PUBLIC_CONFIG.EMPTY}</li>

        {/* error because item does not exist! */}
        {/* <li>DMNO_PUBLIC_CONFIG.ASDF = {DMNO_PUBLIC_CONFIG.ASDF}</li> */}
      </ul>
    </main>
  )
}
