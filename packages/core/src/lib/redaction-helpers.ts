/* eslint-disable prefer-rest-params, func-names */

import { SensitiveValueLookup } from '../config-engine/config-engine';

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


export function resetSensitiveConfigRedactor() {
  (globalThis as any)._dmnoRedactorData = buildRedactionRegex((globalThis as any)._DMNO_SENSITIVE_LOOKUP);
}

const LOG_METHODS = ['trace', 'debug', 'info', 'log', 'info', 'warn', 'error'];

/** patches the global console.log (an other fns) to redact secrets */
export function patchGlobalConsoleToRedactSensitiveLogs() {
  /* eslint-disable no-console */

  const redactor = (globalThis as any)._dmnoRedactorData as ReturnType<typeof buildRedactionRegex>;
  if (!redactor) return;

  // our method of patching involves replacing an internal node method which may not be called if console.log itself has also been patched
  // for example AWS lambdas patches this to write the logs to a file which then is pushed to the rest of their system

  // so first we'll just patch the internal method do deal with normal stdout/stderr logs -------------------------------------

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

  // and now we'll wrap console.log (and the other methods) if it looks like they have been patched already ------------------
  // NOTE - this will not fully redact from everything since we can't safely reach deep into objects
  // ideally we would only turn this when the above method does not work, but it's not trivial to detect when it that is the case
  // so we'll turn it on all the time for now...
  if (
    // !console.log.toString().includes('[native code]') &&
    !(console.log as any)._dmnoPatchedFn
  ) {
    for (const logMethodName of LOG_METHODS) {
      // @ts-ignore
      const originalLogMethod = globalThis.console[logMethodName];

      const patchedFn = function () {
        // @ts-ignore
        originalLogMethod.apply(this, Array.from(arguments).map(redactSensitiveConfig));
      };
      patchedFn._dmnoPatchedFn = true;

      // @ts-ignore
      globalThis.console[logMethodName] = patchedFn;
    }
  }
}

/**
 * helper to restore the original console behaviour and stop redacting secrets
 *
 * this is only really needed during local development when switching settings on/off in a process that does not reload
 * */
export function unpatchGlobalConsoleSensitiveLogRedaction() {
  // we'll only care about the normal case where console.log has NOT been patched by something else... (see above)
  if (!(globalThis as any)._dmnoOrigWriteToConsoleFn) return;

  const kWriteToConsoleSymbol = Object.getOwnPropertySymbols(globalThis.console).find((s) => s.description === 'kWriteToConsole');
  // @ts-ignore
  globalThis.console[kWriteToConsoleSymbol] = (globalThis as any)._dmnoOrigWriteToConsoleFn;
  delete (globalThis as any)._dmnoOrigWriteToConsoleFn;
}

export function redactSensitiveConfig(o: any): any {
  const redactor = (globalThis as any)._dmnoRedactorData as ReturnType<typeof buildRedactionRegex>;
  if (!redactor) return o;
  if (!o) return o;

  // TODO: handle more cases?
  // we can probably redact safely from a few other datatypes - like set,map,etc?
  // objects are a bit tougher
  if (Array.isArray(o)) {
    return o.map(redactSensitiveConfig);
  }

  const type = typeof o;
  if (type === 'string' || (type === 'object' && Object.prototype.toString.call(o) === '[object String]')) {
    return (o as string).replaceAll(redactor.findRegex, redactor.replaceFn);
  }

  return o;
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

export function redactString(valStr: string | undefined, mode?: RedactMode, hideLength = true) {
  if (!valStr) return valStr;

  const hiddenLength = hideLength ? 5 : valStr.length - 2;
  const hiddenStr = '▒'.repeat(hiddenLength);

  if (mode === 'show_last_2') {
    return `${hiddenStr}${valStr.substring(valStr.length - 2, valStr.length)}`;
  } else if (mode === 'show_first_last') {
    return `${valStr.substring(0, 1)}${hiddenStr}${valStr.substring(valStr.length - 1, valStr.length)}`;
  } else { // 'show_first_2' - also default
    return `${valStr.substring(0, 2)}${hiddenStr}`;
  }
}

