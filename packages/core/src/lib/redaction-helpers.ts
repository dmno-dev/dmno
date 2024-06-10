/* eslint-disable prefer-rest-params, func-names */
import _ from 'lodash-es';

type SensitiveValueLookup = Record<string, { masked: string, value: string }>;

const UNMASK_STR = '👁';

function buildRedactionRegex(lookup?: SensitiveValueLookup) {
  if (!lookup || _.isEmpty(lookup)) return {};

  const redactionMap = _.transform(lookup, (acc, val, _key) => {
    acc[val.value] = val.masked;
  }, {} as Record<string, string>);

  const sensitiveValueRegex = new RegExp(
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

  const redactedReplacementFn = (match: string, pre: string, val: string, post: string) => {
    // the pre and post matches only will be populated if they were present
    // and they are used to unmask the secret - so we do not want to replace in this case
    if (pre && post) return val;
    return redactionMap[val];
  };

  return { sensitiveValueRegex, redactedReplacementFn };
}


/** patches the global console.log (an other fns) to redact secrets */
export function patchGlobalConsoleToRedactSecrets(
  sensitiveValueLookup?: SensitiveValueLookup,
) {
  const { sensitiveValueRegex, redactedReplacementFn } = buildRedactionRegex(sensitiveValueLookup);
  // console.log('patching!', redactedReplacementFn);

  const kWriteToConsoleSymbol = Object.getOwnPropertySymbols(globalThis.console).find(
    (s) => s.description === 'kWriteToConsole',
  );

  (globalThis as any)._dmnoSecretRedactionEnabled = true;

  if (!(globalThis as any)._dmnoOrigWriteToConsoleFn) {
    // @ts-ignore
    (globalThis as any)._dmnoOrigWriteToConsoleFn = globalThis.console[kWriteToConsoleSymbol];
  }

  if (sensitiveValueRegex) {
    // @ts-ignore
    globalThis.console[kWriteToConsoleSymbol] = function () {
      (globalThis as any)._dmnoOrigWriteToConsoleFn.apply(this, [
        arguments[0],
        arguments[1].replaceAll(sensitiveValueRegex, redactedReplacementFn),
        arguments[2],
      ]);
    };
  }
}

/** helper to restore the original console behaviour and stop redacting secrets */
export function unpatchGlobalConsoleSecretRedaction() {
  if (!(globalThis as any)._dmnoSecretRedactionEnabled) return;
  if (!(globalThis as any)._dmnoOrigWriteToConsoleFn) {
    throw new Error('No original console fn found');
  }
  const kWriteToConsoleSymbol = Object.getOwnPropertySymbols(globalThis.console).find(
    (s) => s.description === 'kWriteToConsole',
  );
  // @ts-ignore
  globalThis.console[kWriteToConsoleSymbol] = (globalThis as any)._dmnoOrigWriteToConsoleFn;
  (globalThis as any)._dmnoSecretRedactionEnabled = false;
}

/**
 * utility to unmask a secret/sensitive value when logging to the console
 * currently this only works on a single secret, not objects or aggregated strings
 * */
export function unmaskSecret(secretStr: string) {
  if (!(globalThis as any)._dmnoSecretRedactionEnabled) return secretStr;
  return `${UNMASK_STR}${secretStr}${UNMASK_STR}`;
}
