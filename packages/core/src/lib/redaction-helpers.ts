/* eslint-disable prefer-rest-params, func-names */

import { SensitiveValueLookup } from '../inject/dmno-globals-injector';

const UNMASK_STR = '👁';

function buildRedactionRegex(lookup?: SensitiveValueLookup) {
  if (!lookup || !Object.keys(lookup).length) return;

  const redactionMap = {} as Record<string, string>;
  for (const key in lookup) redactionMap[lookup[key].value] = lookup[key].redacted;

  const findRegex = new RegExp(
    [
      `(${UNMASK_STR})?`,
      '(',
      Object.keys(redactionMap)
        // Escape special characters
        .map((s) => s.replace(/[()[\]{}*+?^$|#.,/\\\s-]/g, '\\$&'))
        // Sort for maximal munch
        .sort((a, b) => b.length - a.length)
        .join('|'),
      ')',
      `(${UNMASK_STR})?`,
    ].join(''),
    'g',
  );

  const replaceFn = (match: string, pre: string, val: string, post: string) => {
    // the pre and post matches only will be populated if they were present
    // and they are used to unmask the secret - so we do not want to replace in this case
    if (pre && post) return val;
    return redactionMap[val];
  };

  return { findRegex, replaceFn };
}


let redactor: ReturnType<typeof buildRedactionRegex>;
export function resetSensitiveConfigRedactor() {
  redactor = buildRedactionRegex((globalThis as any)._DMNO_SENSITIVE_LOOKUP);
}

/** patches the global console.log (an other fns) to redact secrets */
export function patchGlobalConsoleToRedactSensitiveLogs() {
  if (!redactor) return;

  // we need the internal symbol name to access the internal method
  const kWriteToConsoleSymbol = Object.getOwnPropertySymbols(globalThis.console).find((s) => s.description === 'kWriteToConsole');

  // @ts-ignore
  (globalThis as any)._dmnoOrigWriteToConsoleFn ||= globalThis.console[kWriteToConsoleSymbol];
  // @ts-ignore
  globalThis.console[kWriteToConsoleSymbol] = function () {
    (globalThis as any)._dmnoOrigWriteToConsoleFn.apply(this, [
      arguments[0],
      redactSensitiveConfig(arguments[1]),
      arguments[2],
    ]);
  };
}

/** helper to restore the original console behaviour and stop redacting secrets */
export function unpatchGlobalConsoleSensitiveLogRedaction() {
  if (!(globalThis as any)._dmnoOrigWriteToConsoleFn) return;


  const kWriteToConsoleSymbol = Object.getOwnPropertySymbols(globalThis.console).find((s) => s.description === 'kWriteToConsole');
  // @ts-ignore
  globalThis.console[kWriteToConsoleSymbol] = (globalThis as any)._dmnoOrigWriteToConsoleFn;
  delete (globalThis as any)._dmnoOrigWriteToConsoleFn;
}

export function redactSensitiveConfig(rawString: string) {
  if (!redactor) return rawString;
  return rawString.replaceAll(redactor.findRegex, redactor.replaceFn);
}

/**
 * utility to unmask a secret/sensitive value when logging to the console
 * currently this only works on a single secret, not objects or aggregated strings
 * */
export function unredact(secretStr: string) {
  // if redaction not enabled, we just return the seccret itself
  if (!(globalThis as any)._dmnoOrigWriteToConsoleFn) return secretStr;
  // otherwise we add some wrapper characters which will be removed by the patched console behaviour
  return `${UNMASK_STR}${secretStr}${UNMASK_STR}`;
}


export type RedactMode = 'show_first_2' | 'show_last_2' | 'show_first_last';

export function redactString(valStr: string, mode?: RedactMode) {
  if (mode === 'show_last_2') {
    return `${'▒'.repeat(valStr.length - 2)}${valStr.substring(valStr.length - 2, valStr.length)}`;
  } else if (mode === 'show_first_last') {
    return `${valStr.substring(0, 1)}${'▒'.repeat(valStr.length - 2)}${valStr.substring(valStr.length - 1, valStr.length)}`;
  } else {
    // if (!mode || mode === 'show_first_2') {
    return `${valStr.substring(0, 2)}${'▒'.repeat(valStr.length - 2)}`;
  }
}

