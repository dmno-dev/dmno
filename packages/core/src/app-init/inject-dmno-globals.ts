import type { InjectedDmnoEnv, InjectedDmnoEnvItem } from '../config-engine/config-engine';

// shim process.env in case we are loading in an env without it
const processExists = !!globalThis.process;
const process = globalThis.process ?? { env: {} };

let originalProcessEnv: Record<string, string> = {};
try {
  originalProcessEnv = structuredClone(process.env) as any;
} catch (err) {
  console.log('error cloning process.env', err);
}

export function injectDmnoGlobals(
  opts?: {
    injectedConfig?: InjectedDmnoEnv,
    trackingObject?: Record<string, boolean>,
    onItemAccess?: (item: InjectedDmnoEnvItem) => void;
  },
) {
  const sensitiveValueLookup: Record<string, { value: string, masked: string }> = {};
  const publicDynamicKeys: Array<string> = [];
  const sensitiveKeys: Array<string> = [];

  // if we've already injected the globals and we didnt have any options passed in, we can bail
  if (!opts && (globalThis as any).DMNO_CONFIG) {
    return {};
  }

  // otherwise we'll inject the DMNO_CONFIG globals
  // either pulling from a passed in config or from process.env.DMNO_INJECTED_ENV

  let injectedDmnoEnv = opts?.injectedConfig;
  if (process.env.DMNO_INJECTED_ENV && !injectedDmnoEnv) {
    injectedDmnoEnv = JSON.parse(process.env.DMNO_INJECTED_ENV);
  }
  if (!injectedDmnoEnv) {
    throw new Error('Unable to find `process.env.DMNO_INJECTED_ENV` - run this command via `dmno run` - see https://dmno.dev/docs/reference/cli/run for more info');
  }

  // feed loaded config values back into process.env (as strings)
  process.env = { ...originalProcessEnv };

  const rawConfigObj: Record<string, string> = {};
  const rawPublicConfigObj: Record<string, string> = {};

  for (const itemKey in injectedDmnoEnv) {
    const injectedItem = injectedDmnoEnv[itemKey];
    const val = injectedItem.value;
    if (val === undefined || val === null) {
      process.env[itemKey] = '';
    } else {
      process.env[itemKey] = val.toString();
    }

    if (!injectedItem.sensitive) {
      rawPublicConfigObj[itemKey] = '*';
      rawConfigObj[itemKey] = '*';
    } else {
      sensitiveKeys.push(itemKey);
      rawConfigObj[itemKey] = '*';
      if (val) {
        sensitiveValueLookup[itemKey] = {
          value: injectedItem.value.toString(),
          masked: '****', // TODO:
        };
      }
    }

    if (!injectedItem.sensitive && injectedItem.dynamic) {
      publicDynamicKeys.push(itemKey);
    }
  }

  // We attach some stuff to the locally running process / globalThis

  (globalThis as any).DMNO_CONFIG = new Proxy(rawConfigObj, {
    get(o, key) {
      const keyStr = key.toString();
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
  (globalThis as any)._DMNO_SENSITIVE_KEYS = sensitiveKeys;
  return { injectedDmnoEnv };
}
