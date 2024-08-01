import { json } from '@remix-run/react';

export async function loader(): Promise<any> {
  // not sure if we want to wrap this with something, but using `Response.json` didnt work properly
  console.log('returning public dynamic config');
  return json((globalThis as any)._DMNO_PUBLIC_DYNAMIC_OBJ);
}
