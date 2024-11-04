/*
  Pages router + edge runtime is not recommended
*/

import { NextResponse } from 'next/server';

export const runtime = 'edge';


export default function handler(
  request: Request,
) {
  const url = new URL(request.url);
  const query = new URLSearchParams(url.searchParams);

  return NextResponse.json({
    PUBLIC_STATIC: DMNO_PUBLIC_CONFIG.PUBLIC_STATIC,
    PUBLIC_DYNAMIC: DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC,
    ...query.get('leak') && {
      SECRET_FOO: DMNO_CONFIG.SECRET_DYNAMIC,
    }
  });
}
