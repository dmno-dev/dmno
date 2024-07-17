/*
  This patches the global ServerResponse object to scan for secret leaks
  currently this is only needed for next.js so it lives here, but we can move into core if needed elsewhere
*/

/* eslint-disable prefer-rest-params */
import zlib from 'node:zlib';
import { ServerResponse } from 'node:http';

// NOTE - previously was using a symbol but got weird because of multiple builds and contexts...
const patchedByDmnoKey = '_patchedByDmno';
export function patchServerResponseToPreventClientLeaks() {
  if (Object.getOwnPropertyDescriptor(ServerResponse.prototype, patchedByDmnoKey)) {
    return;
  }

  Object.defineProperty(ServerResponse.prototype, patchedByDmnoKey, { value: true });

  const serverResponseWrite = ServerResponse.prototype.write;

  // @ts-ignore
  ServerResponse.prototype.write = function dmnoPatchedServerResponseWrite(...args) {
    // TODO: do we want to filter out some requests here? maybe based on the file type?

    const rawChunk = args[0];

    // for now, we only scan rendered html... may need to change this though for server components?
    // so we bail if it looks like this response does not contain html
    const contentType = this.getHeader('content-type')?.toString() || '';
    const runScan = contentType.startsWith('text/');
    // || contentType.startsWith('application/javascript');



    // we want to run the scanner on text/html and text/x-component (server actions)
    // TODO: anything else?
    if (!runScan) {
      // @ts-ignore
      return serverResponseWrite.apply(this, args);
    }

    // have to deal with compressed data, which is awkward but possible
    const compressionType = this.getHeader('Content-Encoding');
    let chunkStr;
    if (!compressionType) {
      const decoder = new TextDecoder();
      chunkStr = decoder.decode(rawChunk);
    } else if (compressionType === 'gzip') {
      // first chunk of data contains only compression headers
      if (!(this as any)._zlibChunks) {
        // (this as any)._zlibHeadersChunk = rawChunk;
        (this as any)._zlibChunks = [rawChunk];
      } else {
        // TODO: figure out how we can unzip one chunk at a time instead of storing everything
        (this as any)._zlibChunks?.push(rawChunk);
        try {
          const unzippedChunk = zlib.unzipSync(Buffer.concat((this as any)._zlibChunks || []), {
            flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
          });
          chunkStr = unzippedChunk.toString('utf-8');
        } catch (err) {
          // console.log('error unzipping chunk', err);
        }
      }
    }
    // TODO: we may want to support other compression schemes? but currently only used in nextjs which is using gzip
    if (chunkStr) {
      // console.log('scanning!', chunkStr.substring(0, 1000));
      (globalThis as any)._dmnoLeakScan(chunkStr, { method: 'patched ServerResponse.write' });
    }

    // @ts-ignore
    return serverResponseWrite.apply(this, args);
  };


  // calling `res.json()` in the api routes on pages router calls `res.end` without called `res.write`
  const serverResponseEnd = ServerResponse.prototype.end;
  // @ts-ignore
  ServerResponse.prototype.end = function patchedServerResponseEnd(...args) {
    const endChunk = args[0];
    // this just needs to work (so far) for nextjs sending json bodies, so does not need to handle all cases...
    if (endChunk && typeof endChunk === 'string') {
      // TODO: currently this throws the error and then things just hang... do we want to try to return an error type response instead?
      (globalThis as any)._dmnoLeakScan(endChunk, { method: 'patched ServerResponse.end' });
    }
    // @ts-ignore
    return serverResponseEnd.apply(this, args);
  };
}
