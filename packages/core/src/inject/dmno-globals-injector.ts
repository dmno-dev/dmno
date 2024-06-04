import type { InjectedDmnoEnv, InjectedDmnoEnvItem } from '../config-engine/config-engine';

const processExists = !!globalThis.process;
let originalProcessEnv: Record<string, string> = {};
if (processExists) {
  try {
    originalProcessEnv = structuredClone(globalThis.process.env) as any;
  } catch (err) {
    // console.log('error cloning process.env', err);
  }
}

export function injectDmnoGlobals(
  opts?: {
    injectedConfig?: InjectedDmnoEnv,
    trackingObject?: Record<string, boolean>,
    onItemAccess?: (item: InjectedDmnoEnvItem) => void;
  },
) {
  const sensitiveValueLookup: Record<string, { value: string, masked: string }> = {};
  const dynamicKeys: Array<string> = [];
  const publicDynamicKeys: Array<string> = [];
  const sensitiveKeys: Array<string> = [];

  // if we've already injected the globals and we didnt have any options passed in, we can bail
  if (!opts && (globalThis as any).DMNO_CONFIG) {
    return {};
  }

  // otherwise we'll inject the DMNO_CONFIG globals
  // either pulling from a passed in config or from process.env.DMNO_INJECTED_ENV

  let injectedDmnoEnv = opts?.injectedConfig;

  if (!injectedDmnoEnv && (globalThis as any)._DMNO_INJECTED_ENV) {
    injectedDmnoEnv = (globalThis as any)._DMNO_INJECTED_ENV;
  } else if (!injectedDmnoEnv && globalThis.process.env.DMNO_INJECTED_ENV) {
    injectedDmnoEnv = JSON.parse(globalThis.process.env.DMNO_INJECTED_ENV);
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

  for (const itemKey in injectedDmnoEnv) {
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
        sensitiveValueLookup[itemKey] = {
          value: injectedItem.value.toString(),
          masked: '****', // TODO:
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
  return {
    injectedDmnoEnv,
    staticReplacements,
    dynamicKeys,
    publicDynamicKeys,
    sensitiveKeys,
  };
}
