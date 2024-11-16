import crypto from 'node:crypto';
import uWS from 'uWebSockets.js';

const MAX_BODY_SIZE = 1024;

export const MIME_TYPES_BY_EXT = {
  js: 'text/javascript',
  html: 'text/html',
  css: 'text/css',
  ico: 'image/x-icon',
  // TODO: will need more for images
};

export function uwsBodyParser(res: uWS.HttpResponse): Promise<{ [key: string]: any } | null> {
  return new Promise((resolve, reject) => {
    let buffer: Buffer = Buffer.alloc(0);
    let totalSize = 0;

    res.onData((ab, isLast) => {
      try {
        if (res.aborted) {
          reject(new Error('Request aborted'));
          return;
        }

        if (ab.byteLength > 0) { // I found some non-last onData with 0 byte length
          // Immediately copy the ArrayBuffer into a Buffer, every return of onData neuters the ArrayBuffer
          // const copy = copyArrayBuffer(ab);
          const copy = ab;
          totalSize += copy.byteLength;
          buffer = Buffer.concat([buffer, Buffer.from(copy)]);
        }

        if (totalSize > MAX_BODY_SIZE) { // define your allowed max size if it applies to you
          reject(new Error('Request body too large: max 4MB allowed'));
          return;
        }

        if (isLast) {
          // If this is the last chunk, process the final buffer
          // Convert the buffer to a string and parse it as JSON
          // this will fail if the buffer doesn't contain a valid JSON (e.g. length = 0)
          const resolveValue = JSON.parse(buffer.toString());
          resolve(resolveValue);
        }
      } catch (err: any) {
        reject(new Error(`Failed to parse JSON: ${err.message}`));
      }
    });
  });
}

export function uwsValidateClientCert(res: uWS.HttpResponse, caCert: string) {
  // validate client certs (mTLS)
  try {
    const clientCert = res.getX509Certificate();
    const x509 = new crypto.X509Certificate(clientCert);
    if (!x509.verify(crypto.createPublicKey(caCert))) {
      res.writeStatus('401');
      res.end(JSON.stringify({ error: 'Unauthorized!' }));
      return false;
    }
    return true;
  } catch (err) {
    res.writeStatus('401');
    res.end('Unauthorized!');
    return false;
  }
}
