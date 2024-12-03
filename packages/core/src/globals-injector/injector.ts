import kleur from 'kleur';
import {
  redactString,
  redactSensitiveConfig,
  resetSensitiveConfigRedactor,
  patchGlobalConsoleToRedactSensitiveLogs,
  unpatchGlobalConsoleSensitiveLogRedaction,
} from '../lib/redaction-helpers';
import { enableHttpInterceptor, disableHttpInterceptor } from '../lib/http-interceptor-utils';
import { patchServerResponseToPreventClientLeaks } from '../lib/patch-server-response';
import { patchResponseToPreventClientLeaks } from '../lib/patch-response';
import type { InjectedDmnoEnv, InjectedDmnoEnvItem, SensitiveValueLookup } from '../config-engine/config-engine';


// not sure about exporting these fns now that we control the behaviour via the schema
export {
  unredact,
} from '../lib/redaction-helpers';

const processExists = !!globalThis.process;
let originalProcessEnv: Record<string, string> = {};
if (processExists) {
  try {
    originalProcessEnv = structuredClone(globalThis.process.env) as any;
  } catch (err) {
    // console.log('error cloning process.env', err);
  }
}

type DmnoInjectionResult = {
  staticReplacements: { dmnoConfig: Record<string, string>, dmnoPublicConfig: Record<string, string> },
  dynamicKeys: Array<string>,
  publicDynamicKeys: Array<string>,
  sensitiveKeys: Array<string>,
  sensitiveValueLookup: Record<string, { value: any, redacted: string }>,
  serviceSettings: InjectedDmnoEnv['$SETTINGS'],
  injectedDmnoEnv: InjectedDmnoEnv,
};

// some object keys are checked by various tools when handling arbitrary data, especially in templates
// because our proxy objects throw errors when unknown keys are accessed, this causes problems
// for now we can just filter out a these keys and it should be fairly harmless
// TODO: ideally this could be customized by the user, and not specific to vue
const IGNORED_PROXY_KEYS = [
  '__v_isRef', // vue - see https://github.com/vuejs/core/blob/70773d00985135a50556c61fb9855ed6b930cb82/packages/reactivity/src/ref.ts#L101
];

export function injectDmnoGlobals(
  opts?: {
    injectedConfig?: InjectedDmnoEnv,
    trackingObject?: Record<string, boolean>,
    onItemAccess?: (item: InjectedDmnoEnvItem) => void;
  },
) {
  // console.log('inject dmno globals!');
  const sensitiveValueLookup: SensitiveValueLookup = {};
  const dynamicKeys: Array<string> = [];
  const sensitiveKeys: Array<string> = [];
  const publicDynamicKeys: Array<string> = [];
  const publicDynamicObj: Record<string, any> = {};

  // save the manually injected env if there is one - this is currently used in netlify functions where we inject the resolved config into the built code
  // but then need it in other places where we call injectDmnoGlobals again
  if (opts?.injectedConfig) {
    (globalThis as any)._DMNO_INJECTED_ENV = opts?.injectedConfig;
  }

  let injectedDmnoEnv = opts?.injectedConfig;

  if (!injectedDmnoEnv) {
    // this is what gets injected by `dmno run`
    if (globalThis.process?.env.DMNO_INJECTED_ENV) {
      injectedDmnoEnv = JSON.parse(globalThis.process?.env.DMNO_INJECTED_ENV);

    // see above - this is the saved copy of what was passed into opts
    } else if ((globalThis as any)._DMNO_INJECTED_ENV) {
      injectedDmnoEnv = (globalThis as any)._DMNO_INJECTED_ENV;
    }
  }

  if (!injectedDmnoEnv) {
    throw new Error('Unable to find `process.env.DMNO_INJECTED_ENV` - run this command via `dmno run` - see https://dmno.dev/docs/reference/cli/run for more info');
  }

  // feed loaded config values back into process.env (as strings)
  if (processExists) {
    // TODO: maybe we dont want to re-assign the object, but just modify keys instead?
    globalThis.process.env = { ...originalProcessEnv };
  }

  const rawConfigObj: Record<string, string> = {};
  const rawPublicConfigObj: Record<string, string> = {};

  const staticReplacements = {
    dmnoConfig: {} as Record<string, string>,
    dmnoPublicConfig: {} as Record<string, string>,
  };

  for (const itemKey in injectedDmnoEnv) {
    if (itemKey === '$SETTINGS') continue;
    const injectedItem = injectedDmnoEnv[itemKey];
    const val = injectedItem.value;

    // re-inject into process.env - only for items that dont exist
    // TODO: this may need more logic here... for example we may want to allow types to specify how they convert to strings for re-injection
    // TODO: we'll also need to figure out nested object paths
    if (processExists) {
      if (val === undefined || val === null) {
        globalThis.process.env[itemKey] ||= '';
      } else {
        globalThis.process.env[itemKey] ||= val.toString();
      }
    }

    if (!injectedItem.sensitive) {
      rawPublicConfigObj[itemKey] = '*';
      rawConfigObj[itemKey] = '*';
    } else {
      sensitiveKeys.push(itemKey);
      rawConfigObj[itemKey] = '*';
      if (val) {
        const valStr = injectedItem.value.toString();
        sensitiveValueLookup[itemKey] = {
          value: valStr,
          redacted: redactString(valStr, injectedItem.redactMode) || '',
          allowedDomains: injectedItem.allowedDomains,
        };
      }
    }


    if (injectedItem.dynamic) {
      dynamicKeys.push(itemKey);
      if (!injectedItem.sensitive) {
        publicDynamicKeys.push(itemKey);
        publicDynamicObj[itemKey] = injectedItem.value;
      }
    }


    // set up static build-time replacements to be injected into vite/webpack/rollup etc config
    if (!injectedItem.dynamic) {
      if (!injectedItem.sensitive) {
        staticReplacements.dmnoPublicConfig[`DMNO_PUBLIC_CONFIG.${itemKey}`] = JSON.stringify(injectedItem.value);
      }
      staticReplacements.dmnoConfig[`DMNO_CONFIG.${itemKey}`] = JSON.stringify(injectedItem.value);
    }
  }

  // We attach some stuff to the locally running process / globalThis
  (globalThis as any).DMNO_CONFIG = new Proxy(rawConfigObj, {
    get(o, key) {
      // ignore symbols, as it likely an external tool checking something
      if (typeof key === 'symbol') return;
      // special cases to avoid throwing on invalid keys
      if (IGNORED_PROXY_KEYS.includes(key)) return;

      if (opts?.trackingObject) opts.trackingObject[key] = true;
      // console.log('get DMNO_CONFIG - ', key);
      if (key in injectedDmnoEnv) {
        if (opts?.onItemAccess) opts.onItemAccess(injectedDmnoEnv[key]);
        return injectedDmnoEnv[key].value;
      }
      throw new Error(`❌ ${key} is not a config item (1)`);
    },
  });

  // attach the same proxy object so we can throw nice errors
  (globalThis as any).DMNO_PUBLIC_CONFIG = new Proxy(rawPublicConfigObj, {
    get(o, key) {
      const keyStr = key.toString();
      // special cases to avoid throwing on invalid keys
      if (IGNORED_PROXY_KEYS.includes(keyStr)) return;

      if (opts?.trackingObject) opts.trackingObject[keyStr] = true;
      // console.log('get DMNO_PUBLIC_CONFIG - ', keyStr);
      if (injectedDmnoEnv[keyStr]?.sensitive) {
        throw new Error(`❌ ${keyStr} is not a public config item! Use \`DMNO_CONFIG.${keyStr}\` instead`);
      }
      if (key in injectedDmnoEnv) {
        if (opts?.onItemAccess) opts.onItemAccess(injectedDmnoEnv[keyStr]);
        return injectedDmnoEnv[keyStr].value;
      }
      throw new Error(`❌ ${keyStr} is not a config item (2)`);
    },
  });
  const serviceSettings = injectedDmnoEnv.$SETTINGS;

  (globalThis as any)._DMNO_SERVICE_SETTINGS = serviceSettings;
  (globalThis as any)._DMNO_PUBLIC_DYNAMIC_KEYS = publicDynamicKeys;
  (globalThis as any)._DMNO_PUBLIC_DYNAMIC_OBJ = publicDynamicObj;
  (globalThis as any)._DMNO_SENSITIVE_LOOKUP = sensitiveValueLookup;


  (globalThis as any)._dmnoRepatchGlobals = repatchGlobals;
  repatchGlobals();


  // TODO: make un-patchable

  const injectionResult: DmnoInjectionResult = {
    staticReplacements,
    dynamicKeys,
    publicDynamicKeys,
    sensitiveKeys,
    sensitiveValueLookup,
    serviceSettings,
    injectedDmnoEnv,
  };

  return injectionResult;
}

function repatchGlobals() {
  const serviceSettings = (globalThis as any)._DMNO_SERVICE_SETTINGS;
  // builds the redaction find/replace but does not apply it globally
  // it is still used in a helper fn that end users can use manually
  resetSensitiveConfigRedactor();
  if (serviceSettings.redactSensitiveLogs) {
    patchGlobalConsoleToRedactSensitiveLogs();
  } else {
    unpatchGlobalConsoleSensitiveLogRedaction();
  }

  if (serviceSettings.interceptSensitiveLeakRequests) {
    enableHttpInterceptor();
  } else {
    disableHttpInterceptor();
  }

  if (serviceSettings.preventClientLeaks) {
    // @ts-ignore
    if (typeof __DMNO_BUILD_FOR_EDGE__ === 'undefined' || !__DMNO_BUILD_FOR_EDGE__) {
      patchServerResponseToPreventClientLeaks();
    } else {
      patchResponseToPreventClientLeaks();
    }
  }
}


// this does not cover all cases, but serves our needs so far for Next.js
function isString(s: any) {
  return Object.prototype.toString.call(s) === '[object String]';
}

(globalThis as any)._dmnoRedact = redactSensitiveConfig;

// reusable leak scanning helper function, used by various integrations
(globalThis as any)._dmnoLeakScan = function _dmnoLeakScan(
  toScan: string | Response | ReadableStream,
  // optional additional information about what is being scanned to be used in error messages
  meta?: {
    method?: string,
    file?: string
  },
) {
  function scanStrForLeaks(strToScan: string) {
    // console.log('[dmno leak scanner] ', strToScan.substr(0, 250));

    // TODO: probably should use a single regex
    const sensitiveLookup = (globalThis as any)._DMNO_SENSITIVE_LOOKUP;
    for (const itemKey in sensitiveLookup) {
      if (strToScan.includes(sensitiveLookup[itemKey].value)) {
      // error stack can gets awkwardly buried since we're so deep in the internals
      // so we'll write a nicer error message to help the user debug
        console.error([ // eslint-disable-line no-console
          '',
          `🚨 ${kleur.bgRed(' DETECTED LEAKED SENSITIVE CONFIG ')} 🚨`,
          `> Config item key: ${kleur.blue(itemKey)}`,
          ...meta?.method ? [`> Scan method: ${meta.method}`] : [],
          ...meta?.file ? [`> File: ${meta.file}`] : [],
          '',
        ].join('\n'));

        throw new Error(`🚨 DETECTED LEAKED SENSITIVE CONFIG - ${itemKey}`);
      }
    }
  }

  // scan a string
  if (isString(toScan)) {
    scanStrForLeaks(toScan as string);
    return toScan;
  // scan a ReadableStream by piping it through a scanner
  } else if (toScan instanceof ReadableStream) {
    if (toScan.locked) {
      // console.log('> stream already locked');
      return toScan;
    } else {
      // console.log('> stream will be scanned!');
    }
    const chunkDecoder = new TextDecoder();
    return toScan.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const chunkStr = chunkDecoder.decode(chunk);
          scanStrForLeaks(chunkStr);
          controller.enqueue(chunk);
        },
      }),
    );
  }
  // other things may be passed in like Buffer... but we'll ignore for now
  return toScan;
};
