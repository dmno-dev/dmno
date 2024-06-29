/* eslint-disable prefer-rest-params */
import zlib from 'node:zlib';
import { ServerResponse } from 'node:http';

const patchedByDmnoSymbol = Symbol('patchedByDmno');
export function enableLeakDetectionByPatchingServerResponse() {
  console.log('patching server response!');
  if ((ServerResponse as any)[patchedByDmnoSymbol]) return;

  (ServerResponse as any)[patchedByDmnoSymbol] = true;

  const origFn = ServerResponse.prototype.write;

  // @ts-ignore
  ServerResponse.prototype.write = function patchedWriteFn(...args) {
    console.log('patched write');
    // TODO: exclude more file types
    if (
      this.req.url.startsWith('/_next/static/')
      || this.req.url.endsWith('.ico')
    ) {
      // @ts-ignore
      return origFn.call(this, ...args);
    }

    // console.log(`URL = ${this.req.url}`);
    // console.log(
    //   `PATCHED ServerResponse.write - ${this.req.url} `,
    //   // Array.from(arguments),
    // );

    const rawChunk = args[0];
    const compressionType = this.getHeader('Content-Encoding');

    let chunkStr;
    if (!compressionType) {
      const decoder = new TextDecoder();
      chunkStr = decoder.decode(rawChunk);
    } else if (compressionType === 'gzip') {
      // first chunk of data contains only compression headers
      if (!(this as any)._zlibHeadersChunk) {
        (this as any)._zlibHeadersChunk = rawChunk;
      } else {
        // need to append headers to each chunk in order to decompress
        const buf = Buffer.concat([(this as any)._zlibHeadersChunk, rawChunk]);
        try {
          const unzippedChunk = zlib.unzipSync(buf, {
            // flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
          });
          chunkStr = unzippedChunk.toString('utf-8');
        } catch (err) {
          // console.log('error unzipping chunk', err);
          // we get "incorrect data check" errors on some chunks, not sure why
          // but it seems the leak detection works, so we can ignore these chunks
        }
      }
    }

    if (chunkStr) {
      // TODO: probably should use a single regex
      const sensitiveLookup = (globalThis as any)._DMNO_SENSITIVE_LOOKUP;
      for (const itemKey in sensitiveLookup) {
        if (chunkStr.includes(sensitiveLookup[itemKey].value)) {
          // TODO: better error details to help user _find_ the problem
          throw new Error(`🚨 DETECTED LEAKED CONFIG ITEM! ${itemKey}`);
        }
      }
    }

    // @ts-ignore
    return origFn.call(this, ...args);
  };
}
