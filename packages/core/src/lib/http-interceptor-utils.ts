import kleur from 'kleur';
import { BatchInterceptor } from '@mswjs/interceptors';
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';
import { FetchInterceptor } from '@mswjs/interceptors/fetch';

import { checkUrlInAllowList } from './url-pattern-utils';
import { SensitiveValueLookup } from '../config-engine/config-engine';


// some funky stuff happening to keep track of the interceptor globally
// because during vite reloads the module may be reloaded multiple times

function initInterceptor() {
  if ((globalThis as any)._dmnoHttpInterceptor) {
    (globalThis as any)._dmnoHttpInterceptor.dispose();
  }

  // console.log('Initializing http interceptor');

  const interceptor = new BatchInterceptor({
    name: 'dmno-interceptor',
    interceptors: [
      new ClientRequestInterceptor(),
      new XMLHttpRequestInterceptor(),
      new FetchInterceptor(),
    ],
  });
  (globalThis as any)._dmnoHttpInterceptor = interceptor;

  interceptor.on('request', async ({ request, requestId }) => {
    if (!findSensitiveValuesRegex) return;

    const url = new URL(request.url);

    // we'll construct an object with everything we want to check so we can run a single regex on it (stringified)
    const objToCheck = {
      headers: Object.fromEntries(Array.from(request.headers.entries())),
      body: await request.clone().text(),
      queryParams: Object.fromEntries(Array.from(url.searchParams.entries())),
    // do we want to check the URL itself?
    };
    // console.log(request);
    // console.log(objToCheck);

    // TODO: will need to think about encoding/escaping since we're looking in this string for the sensitive strings as-is
    const objToCheckAsString = JSON.stringify(objToCheck);

    const matches = objToCheckAsString.match(findSensitiveValuesRegex);
    for (const match of matches || []) {
      const matchedItem = sensitiveInterceptorLookup[match];
      if (checkUrlInAllowList(request.url, matchedItem.allowedDomains)) continue;

      // logging the issue with more details - not sure if this is the best way?
      console.error([
        '',
        `🛑 ${kleur.bgRed(' SENSITIVE CONFIG LEAK INTERCEPTED ')} 🛑`,
        ` > request url: ${kleur.green(request.url)}`,
        ` > config key: ${kleur.blue(matchedItem.key)}`,
        matchedItem.allowedDomains.length
          ? ` > allowed domains: ${kleur.magenta(matchedItem.allowedDomains.join(', '))}`
          : ` > allowed domains: ${kleur.gray().italic('none')}`,

        '',
      ].join('\n'));

      // this gets turned into a request response, even though I'd like to just throw the error
      // see https://github.com/mswjs/interceptors/issues/579
      // see nextTick above too
      throw new Error(`🛑 SECRET LEAK DETECTED! - ${matchedItem.key} was stopped from being sent to ${request.url}`);
    }
  });

  // this forces our error to be actually thrown insted of being translated into a fake 500 response
  // see https://github.com/mswjs/interceptors/pull/566 for details (not currently documented)
  interceptor.on('unhandledException', ({
    error, /* request, requestId, controller, */
  }) => {
    throw error;
  });

  interceptor.apply();
}



let sensitiveInterceptorLookup: Record<string, { key: string, allowedDomains: Array<string> }>;
let findSensitiveValuesRegex: RegExp | undefined;
function buildSensitiveValuesLoookup(lookup?: SensitiveValueLookup) {
  sensitiveInterceptorLookup = {};
  findSensitiveValuesRegex = undefined;

  if (!lookup || !Object.keys(lookup).length) return;
  for (const key in lookup) {
    sensitiveInterceptorLookup[lookup[key].value] = {
      key,
      allowedDomains: lookup[key].allowedDomains || [],
    };
  }

  const findRegex = new RegExp(
    Object.keys(sensitiveInterceptorLookup)
    // Escape special characters
      .map((s) => s.replace(/[()[\]{}*+?^$|#.,/\\\s-]/g, '\\$&'))
    // Sort for maximal munch
      .sort((a, b) => b.length - a.length)
      .join('|'),
    'g',
  );
  findSensitiveValuesRegex = findRegex;
}

export function enableHttpInterceptor() {
  buildSensitiveValuesLoookup((globalThis as any)._DMNO_SENSITIVE_LOOKUP);
  if (findSensitiveValuesRegex) initInterceptor();
}
export function disableHttpInterceptor() {
  // console.log('deactivating interceptor');
  (globalThis as any)._dmnoHttpInterceptor?.dispose();
  delete (globalThis as any)._dmnoHttpInterceptor;
}


