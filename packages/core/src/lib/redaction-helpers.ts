/* eslint-disable prefer-rest-params, func-names */

import { SensitiveValueLookup } from '../config-engine/config-engine';

const UNMASK_STR = '👁';
const gThis = globalThis as any;

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
  redactor = buildRedactionRegex(gThis._DMNO_SENSITIVE_LOOKUP);
}

const LOG_METHODS = ['trace', 'debug', 'info', 'log', 'info', 'warn', 'error'];

const isDmnoPatchedFnSymbol = Symbol('isDmnoPatchedFn');

/** patches the global console.log (an other fns) to redact secrets */
export function patchGlobalConsoleToRedactSensitiveLogs() {
  if (!redactor) return;

  gThis._dmnoOrigConsoleMethods ||= {};

  // our method of patching involves replacing an internal node method which may not be called if console.log itself has also been patched
  // for example AWS lambdas patches this to write the logs to a file which then is pushed to the rest of their system

  // so first we'll just patch the internal method do deal with normal stdout/stderr logs -------------------------------------
  // This method works perfectly on all data shapes, except that in some deployed environments, they may be already redirectly logs without calling it

  // we need the internal symbol name to access the internal method
  const kWriteToConsoleSymbol = Object.getOwnPropertySymbols(gThis.console).find((s) => s.description === 'kWriteToConsole')!;
  gThis._dmnoOrigConsoleMethods[kWriteToConsoleSymbol] ||= gThis.console[kWriteToConsoleSymbol];
  gThis.console[kWriteToConsoleSymbol] = function () {
    return gThis._dmnoOrigConsoleMethods[kWriteToConsoleSymbol].apply(this, [
      arguments[0],
      redactSensitiveConfig(arguments[1]),
      arguments[2],
    ]);
  };

  // and now we'll wrap console.log (and the other methods) too, in case the platform we are on sidesteps the patched internals ------------------
  // NOTE - this will not fully redact from everything since we can't safely reach deep into objects
  if (!(console.log as any)[isDmnoPatchedFnSymbol]) { // eslint-disable-line no-console
    for (const logMethodName of LOG_METHODS) {
      gThis._dmnoOrigConsoleMethods[logMethodName] ||= gThis.console[logMethodName];

      // eslint-disable-next-line @typescript-eslint/no-loop-func
      const patchedFn = function () {
        // @ts-ignore
        gThis._dmnoOrigConsoleMethods[logMethodName].apply(this, Array.from(arguments).map(redactSensitiveConfig));
      };
      patchedFn[isDmnoPatchedFnSymbol] = true;

      gThis.console[logMethodName] = patchedFn;
    }
  }
}

/**
 * helper to restore the original console behaviour and stop redacting secrets
 *
 * this is only really needed during local development when switching settings on/off in a process that does not reload
 * */
export function unpatchGlobalConsoleSensitiveLogRedaction() {
  if (!gThis._dmnoOrigConsoleMethods) return;

  for (const methodName in gThis._dmnoOrigConsoleMethods) {
    gThis.console[methodName] = gThis._dmnoOrigConsoleMethods[methodName];
  }
  delete gThis._dmnoOrigConsoleMethods;
}

export function redactSensitiveConfig(o: any): any {
  if (!redactor) return o;
  if (!o) return o;

  // TODO: maybe wrap all in a try catch so we dont cause crashes?
  // TODO: handle more cases? like set,map,etc?

  // string case
  const type = typeof o;
  if (type === 'string' || (type === 'object' && Object.prototype.toString.call(o) === '[object String]')) {
    return (o as string).replaceAll(redactor.findRegex, redactor.replaceFn);
  }

  // array case
  if (Array.isArray(o)) {
    return o.map(redactSensitiveConfig);
  }

  // objects
  if (Object.getPrototypeOf(o) === Object.prototype) {
    // && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
    return Object.entries(o)
      .reduce((a, [key, val]) => {
        a[key] = redactSensitiveConfig(val);
        return a;
      }, {} as any);
  }

  return o;
}

/**
 * utility to unmask a secret/sensitive value when logging to the console
 * currently this only works on a single secret, not objects or aggregated strings
 * */
export function unredact(secretStr: string) {
  // if redaction not enabled, we just return the secret itself
  if (!gThis._dmnoOrigConsoleMethods) return secretStr;
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

