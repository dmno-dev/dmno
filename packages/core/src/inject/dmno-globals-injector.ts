import {
  redactString, resetSensitiveConfigRedactor,
  patchGlobalConsoleToRedactSensitiveLogs,
  unpatchGlobalConsoleSensitiveLogRedaction,
} from '../lib/redaction-helpers';
import { enableHttpInterceptor, disableHttpInterceptor } from '../lib/http-interceptor-utils';
import type { InjectedDmnoEnv, InjectedDmnoEnvItem } from '../config-engine/config-engine';


// not sure about exporting these fns now that we control the behaviour via the schema
export {
  // patchGlobalConsoleToRedactSensitiveLogs,
  // unpatchGlobalConsoleSensitiveLogRedaction,
  unredact,
} from '../lib/redaction-helpers';

// export { enableHttpInterceptor, disableHttpInterceptor } from '../lib/http-interceptor-utils';

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
  staticReplacements: Record<string, string>
  dynamicKeys: Array<string>,
  publicDynamicKeys: Array<string>,
  sensitiveKeys: Array<string>,
  sensitiveValueLookup: Record<string, { value: any, redacted: string }>,
  serviceSettings: InjectedDmnoEnv['$SETTINGS'],
};

export type SensitiveValueLookup = Record<string, {
  redacted: string,
  value: string,
  allowedDomains?: Array<string>,
}>;

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
  const sensitiveValueLookup: SensitiveValueLookup = {};
  const dynamicKeys: Array<string> = [];
  const sensitiveKeys: Array<string> = [];
  const publicDynamicKeys: Array<string> = [];


  // // if we've already injected the globals and we didnt have any options passed in, we can bail
  // if (!opts && (globalThis as any)._DMNO_CACHED_INJECTION_RESULT) {
  //   console.log('> using cached injection result');
  //   return (globalThis as any)._DMNO_CACHED_INJECTION_RESULT as DmnoInjectionResult;
  // }

  // otherwise we'll inject the DMNO_CONFIG globals
  // either pulling from a passed in config or from process.env.DMNO_INJECTED_ENV

  // save the manually injected env if there is one - this is currently used in netlify functions where we inject the resolved config into the built code
  // but then need it in other places where we call injectDmnoGlobals again
  if (opts?.injectedConfig) {
    (globalThis as any)._DMNO_INJECTED_ENV = opts?.injectedConfig;
  }

  let injectedDmnoEnv = opts?.injectedConfig;

  if (!injectedDmnoEnv) {
    if (globalThis.process?.env.DMNO_INJECTED_ENV) {
      injectedDmnoEnv = JSON.parse(globalThis.process?.env.DMNO_INJECTED_ENV);
    } else if ((globalThis as any)._DMNO_INJECTED_ENV) {
      injectedDmnoEnv = (globalThis as any)._DMNO_INJECTED_ENV;
    }
  }

  if (!injectedDmnoEnv) {
    // console.log(globalThis);
    // console.log(globalThis.process.env);
    throw new Error('Unable to find `process.env.DMNO_INJECTED_ENV` - run this command via `dmno run` - see https://dmno.dev/docs/reference/cli/run for more info');
  }

  // feed loaded config values back into process.env (as strings)
  if (processExists) {
    // TODO: maybe we dont want to re-assign the object, but just modify keys instead?
    globalThis.process.env = { ...originalProcessEnv };
  }

  const rawConfigObj: Record<string, string> = {};
  const rawPublicConfigObj: Record<string, string> = {};

  const staticReplacements: Record<string, string> = {};

  const serviceSettings = injectedDmnoEnv.$SETTINGS;

  for (const itemKey in injectedDmnoEnv) {
    if (itemKey === '$SETTINGS') continue;
    const injectedItem = injectedDmnoEnv[itemKey];
    const val = injectedItem.value;

    // re-inject into process.env
    if (processExists) {
      if (val === undefined || val === null) {
        globalThis.process.env[itemKey] = '';
      } else {
        globalThis.process.env[itemKey] = val.toString();
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
          redacted: redactString(valStr, injectedItem.redactMode),
          allowedDomains: injectedItem.allowedDomains,
        };
      }
    }


    if (injectedItem.dynamic) {
      dynamicKeys.push(itemKey);
      if (!injectedItem.sensitive) publicDynamicKeys.push(itemKey);
    }


    if (injectedItem.sensitive) {
      // if it's sensitive and static, we'll inject only into DMNO_CONFIG
      if (!injectedItem.dynamic) {
        staticReplacements[`DMNO_CONFIG.${itemKey}`] = JSON.stringify(injectedItem.value);
      }
    } else {
      // if public and static, we'll inject into vite's rewrites
      if (!injectedItem.dynamic) {
        // add rollup rewrite/define for non-sensitive items
        staticReplacements[`DMNO_PUBLIC_CONFIG.${itemKey}`] = JSON.stringify(injectedItem.value);
        staticReplacements[`DMNO_CONFIG.${itemKey}`] = JSON.stringify(injectedItem.value);
      }
    }
  }

  // We attach some stuff to the locally running process / globalThis

  (globalThis as any).DMNO_CONFIG = new Proxy(rawConfigObj, {
    get(o, key) {
      const keyStr = key.toString();
      // special cases to avoid throwing on invalid keys
      if (IGNORED_PROXY_KEYS.includes(keyStr)) return;

      if (opts?.trackingObject) opts.trackingObject[keyStr] = true;
      // console.log('get DMNO_CONFIG - ', key);
      if (key in injectedDmnoEnv) {
        if (opts?.onItemAccess) opts.onItemAccess(injectedDmnoEnv[keyStr]);
        return injectedDmnoEnv[keyStr].value;
      }
      throw new Error(`❌ ${keyStr} is not a config item (1)`);
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

  (globalThis as any)._DMNO_PUBLIC_DYNAMIC_KEYS = publicDynamicKeys;
  (globalThis as any)._DMNO_SENSITIVE_LOOKUP = sensitiveValueLookup;

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

  const injectionResult: DmnoInjectionResult = {
    staticReplacements,
    dynamicKeys,
    publicDynamicKeys,
    sensitiveKeys,
    sensitiveValueLookup,
    serviceSettings,
  };
  // (globalThis as any)._DMNO_CACHED_INJECTION_RESULT = injectionResult;

  return injectionResult;
}
