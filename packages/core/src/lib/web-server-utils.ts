import crypto from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';


const MAX_BODY_SIZE = 1024;

export const MIME_TYPES_BY_EXT = {
  js: 'text/javascript',
  html: 'text/html',
  css: 'text/css',
  ico: 'image/x-icon',
  // TODO: will need more for images
};


export function bodyParser(req: IncomingMessage): Promise<{ [key: string]: any } | null> {
  return new Promise((resolve, reject) => {
    let body: any = [];
    req
      .on('data', (chunk) => {
        body.push(chunk);
        // TODO: re-implement max size check
      })
      .on('end', () => {
        body = Buffer.concat(body).toString();
        // at this point, `body` has the entire request body stored in it as a string
        try {
          const resolveValue = JSON.parse(body);
          resolve(resolveValue);
        } catch (err: any) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      });
  });
}

export function writeResponse(
  res: ServerResponse,
  statusCode: number,
  content: string | any,
  contentType = 'application/json',
) {
  res.statusCode = statusCode;
  res.setHeader('content-type', contentType);
  res.end(contentType === 'application/json' ? JSON.stringify(content) : content.toString());
}
