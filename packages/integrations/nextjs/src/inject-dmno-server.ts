/* eslint-disable prefer-rest-params */
/* eslint-disable no-console */
import zlib from 'node:zlib';
import { ServerResponse } from 'node:http';
import { injectDmnoGlobals } from 'dmno/injector-standalone';
import { headers } from 'next/headers.js';

console.log('INJECT DMNO + NEXT SERVER CODE');

injectDmnoGlobals({
  onItemAccess: (item: any) => {
    // attempts to force the route into dynamic rendering mode so it wont put our our dynamic value into a pre-rendered page
    // however we have to wrap in try/catch because you can only call headers() within certain parts of the page... so it's not 100% foolproof
    if (item.dynamic) {
      // eslint-disable-next-line max-statements-per-line, no-empty
      try { headers(); } catch (err) {}
    }
  },
});

export const publicDynamicEnvObj: Record<string, any> = {};
const publicDynamicKeys = (globalThis as any)._DMNO_PUBLIC_DYNAMIC_KEYS as Array<string>;
for (const itemKey of publicDynamicKeys) {
  publicDynamicEnvObj[itemKey] = (globalThis as any).DMNO_PUBLIC_CONFIG[itemKey];
}


// console.log(globalThis);
// const r: ServerResponse;
// r.getHeader('Content-Encoding')

// if (!(globalThis as any)._dmnoNextPatch) {
//   (globalThis as any)._dmnoNextPatch = true;

//   const patchObj: any = ServerResponse;
//   console.log('object to patch', Object.getOwnPropertyDescriptors(patchObj.prototype));

//   const patchFnName = 'write';

//   console.log('fn to patch', patchObj.prototype[patchFnName]);

//   const orig = patchObj.prototype[patchFnName];
//   if (orig) {
//   // @ts-ignore
//     patchObj.prototype[patchFnName] = function patchedFn() {
//       // TODO: exclude more file types
//       if (
//         this.req.url.startsWith('/_next/static/')
//         || this.req.url.endsWith('.ico')
//       ) return orig.call(this, ...Array.from(arguments));

//       console.log(`URL = ${this.req.url}`);
//       console.log(
//         `PATCHED ${patchFnName} - ${this.req.url} `,
//         // Array.from(arguments),
//       );

//       const rawChunk = arguments[0];
//       const compressionType = this.getHeader('Content-Encoding');

//       let chunkStr: string | undefined;
//       if (!compressionType) {
//         const decoder = new TextDecoder();
//         chunkStr = decoder.decode(rawChunk);
//       } else if (compressionType === 'gzip') {
//         // first chunk of data contains only compression headers
//         if (!this._zlibHeadersChunk) {
//           this._zlibHeadersChunk = rawChunk;
//         } else {
//           // need to append headers to each chunk in order to decompress
//           const buf = Buffer.concat([this._zlibHeadersChunk, rawChunk]);
//           try {
//             const unzippedChunk = zlib.unzipSync(buf, {
//               // flush: zlib.constants.Z_SYNC_FLUSH,
//               finishFlush: zlib.constants.Z_SYNC_FLUSH,
//             });
//             chunkStr = unzippedChunk.toString('utf-8');
//           } catch (err) {
//             // we get "incorrect data check" errors on some chunks, not sure why
//             // but it seems the leak detection works, so we can ignore these chunks
//           }
//         }
//       }

//       if (chunkStr) {
//         // TODO: probably should use a single regex
//         const sensitiveLookup = (globalThis as any)._DMNO_SENSITIVE_LOOKUP;
//         for (const itemKey in sensitiveLookup) {
//           if (chunkStr.includes(sensitiveLookup[itemKey].value)) {
//             // TODO: better error details to help user _find_ the problem
//             throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM! ${itemKey}`);
//           }
//         }
//       }

//       return orig.call(this, ...Array.from(arguments));
//     };
//   }
// }
