import kleur from 'kleur';

import { checkUrlInAllowList } from './url-pattern-utils';
import type { SensitiveValueLookup } from '../config-engine/config-engine';


function buildSensitiveValuesLoookup(lookup?: SensitiveValueLookup) {
  const valueLookup: Record<string, { key: string, allowedDomains: Array<string> }> = {};

  if (!lookup || !Object.keys(lookup).length) return { regex: false, lookup: {} };
  for (const key in lookup) {
    valueLookup[lookup[key].value] = {
      key,
      allowedDomains: lookup[key].allowedDomains || [],
    };
  }

  const findRegex = new RegExp(
    Object.keys(valueLookup)
      // Escape special characters
      .map((s) => s.replace(/[()[\]{}*+?^$|#.,/\\\s-]/g, '\\$&'))
      // Sort for maximal munch
      .sort((a, b) => b.length - a.length)
      .join('|'),
    'g',
  );
  return { regex: findRegex, lookup: valueLookup };
}

// @ts-ignore
function dmnoPatchedFetch(...args: Array<any>) {
  if ((globalThis.fetch as any)._dmnoSensitiveRegex) {
    const [urlOrFetchOpts, fetchOptsArg] = args;
    const fetchOpts = (typeof urlOrFetchOpts === 'object' ? urlOrFetchOpts : fetchOptsArg) || {};
    const fetchUrl = (typeof urlOrFetchOpts === 'object' ? (urlOrFetchOpts as Request).url : urlOrFetchOpts).toString();

    // TODO: probably want to be smarter here and just scan headers, and body depending on content type
    const objToCheckAsString = JSON.stringify(fetchOpts);

    const matches = objToCheckAsString.match((globalThis.fetch as any)._dmnoSensitiveRegex);
    for (const match of matches || []) {
      const matchedItem = (globalThis.fetch as any)._dmnoSensitiveLookup[match];
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

  // @ts-ignore
  return dmnoPatchedFetch._unpatchedFetch.apply(this, args);
}



export function enableHttpInterceptor() {
  const { regex, lookup } = buildSensitiveValuesLoookup((globalThis as any)._DMNO_SENSITIVE_LOOKUP);

  // console.log('enabling http interceptor', regex, lookup);

  const fetchAlreadyPatched = Object.getOwnPropertyDescriptor(globalThis.fetch, '_patchedByDmno');

  if (fetchAlreadyPatched) {
    // console.log('fetch already patched');
  } else {
    const unpatchedFetch = globalThis.fetch;
    (dmnoPatchedFetch as any)._unpatchedFetch = unpatchedFetch;
    (dmnoPatchedFetch as any)._patchedByDmno = true;
    Object.defineProperty(dmnoPatchedFetch, '_patchedByDmno', { value: true });
    globalThis.fetch = dmnoPatchedFetch;
  }
  (globalThis.fetch as any)._dmnoSensitiveRegex = regex;
  (globalThis.fetch as any)._dmnoSensitiveLookup = lookup;
}
export function disableHttpInterceptor() {
  if ((globalThis.fetch as any)._unpatchedFetch) {
    globalThis.fetch = (globalThis.fetch as any)._unpatchedFetch;
  }
}
