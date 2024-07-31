import kleur from 'kleur';

import { checkUrlInAllowList } from './url-pattern-utils';
import type { SensitiveValueLookup } from '../config-engine/config-engine';

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

let origFetch: typeof fetch | undefined;
export function enableHttpInterceptor() {
  buildSensitiveValuesLoookup((globalThis as any)._DMNO_SENSITIVE_LOOKUP);
  // console.log('enabling http interceptor', findSensitiveValuesRegex);

  const fetchAlreadyPatched = Object.getOwnPropertyDescriptor(globalThis.fetch, '_patchedByDmno');

  // console.log('Initializing http interceptor');
  if (fetchAlreadyPatched) {
    console.log('fetch already patched');
    return;
  }

  origFetch = globalThis.fetch;

  globalThis.fetch = function dmnoPatchedFetch(...args) {
    if (findSensitiveValuesRegex) {
      const [urlOrFetchOpts, fetchOptsArg] = args;
      const fetchOpts = (typeof urlOrFetchOpts === 'object' ? urlOrFetchOpts : fetchOptsArg) || {};
      const fetchUrl = (typeof urlOrFetchOpts === 'object' ? (urlOrFetchOpts as Request).url : urlOrFetchOpts).toString();

      // TODO: probably want to be smarter here and just scan headers, and body depending on content type
      const objToCheckAsString = JSON.stringify(fetchOpts);

      const matches = objToCheckAsString.match(findSensitiveValuesRegex);
      for (const match of matches || []) {
        const matchedItem = sensitiveInterceptorLookup[match];
        if (checkUrlInAllowList(fetchUrl, matchedItem.allowedDomains)) continue;

        // logging the issue with more details - not sure if this is the best way?
        console.error([
          '',
          `🛑 ${kleur.bgRed(' SENSITIVE CONFIG LEAK INTERCEPTED ')} 🛑`,
          ` > request url: ${kleur.green(fetchUrl)}`,
          ` > config key: ${kleur.blue(matchedItem.key)}`,
          matchedItem.allowedDomains.length
            ? ` > allowed domains: ${kleur.magenta(matchedItem.allowedDomains.join(', '))}`
            : ` > allowed domains: ${kleur.gray().italic('none')}`,

          '',
        ].join('\n'));

        // this gets turned into a request response, even though I'd like to just throw the error
        // see https://github.com/mswjs/interceptors/issues/579
        // see nextTick above too
        throw new Error(`🛑 SECRET LEAK DETECTED! - ${matchedItem.key} was stopped from being sent to ${fetchUrl}`);
      }
    }

    return origFetch!.apply(this, args);
  };
  Object.defineProperty(globalThis.fetch, '_patchedByDmno', { value: true });
}
export function disableHttpInterceptor() {
  if (origFetch) globalThis.fetch = origFetch;
  origFetch = undefined;
}
