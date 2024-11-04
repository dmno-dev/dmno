import { NextResponse } from "next/server";

export const runtime = 'nodejs';

console.log('secret foo = '+DMNO_CONFIG.SECRET_FOO);
console.log('secret static = '+DMNO_CONFIG.SECRET_STATIC);

export async function GET(request: Request) {
  console.log('secret foo = '+DMNO_CONFIG.SECRET_FOO);
  console.log('secret static = '+DMNO_CONFIG.SECRET_STATIC);

  const url = new URL(request.url);
  const query = new URLSearchParams(url.searchParams);

  const r = Response.json({
    PUBLIC_STATIC: DMNO_PUBLIC_CONFIG.PUBLIC_STATIC,
    PUBLIC_DYNAMIC: DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC,
    ...query.get('leak') && {
      SECRET_FOO: DMNO_CONFIG.STRIPE_SECRET_KEY,
    }
  });

  // console.log(r.constructor);
  // console.log(r.constructor.prototype);
  // console.log(r instanceof Response);
  // console.log(Response, globalThis.Response, (globalThis as any).DmnoPatchedResponse);

  return r;
}
