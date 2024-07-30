/*
  This patches the global Response class to scan for secret leaks - currently used for next.js on Vercel in edge runtime only
*/

export function patchResponseToPreventClientLeaks() {
  if ((globalThis.Response as any)._patchedByDmno) {
    // console.log('\\n>>>> global Response already patched <<<<< \\n');
    return;
  }

  const _UnpatchedResponse = globalThis.Response;
  globalThis.Response = class DmnoPatchedResponse extends _UnpatchedResponse {
    static _patchedByDmno = true;
    constructor(body: any, init: any) {
      // console.log('patched Response constructor');
      super((globalThis as any)._dmnoLeakScan(body, { method: 'patched Response constructor' }), init);
    }
    static json(data: any, init: any) {
      // console.log('patched Response.json');
      (globalThis as any)._dmnoLeakScan(JSON.stringify(data), { method: 'patched Response.json' });
      const r = _UnpatchedResponse.json(data, init);
      Object.setPrototypeOf(r, Response.prototype);
      return r;
    }
  };
}
