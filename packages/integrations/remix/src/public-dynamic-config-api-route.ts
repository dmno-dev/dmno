export async function loader(): Promise<any> {
  // not sure if we want to wrap this with something, but using `Response.json` didnt work properly
  return (globalThis as any)._DMNO_PUBLIC_DYNAMIC_OBJ;
}
