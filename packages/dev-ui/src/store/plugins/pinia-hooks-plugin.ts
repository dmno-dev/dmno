import { isFunction, isPromise } from '@sindresorhus/is';
import Debug from 'debug';
import {
  type ComponentInternalInstance,
  computed,
  getCurrentInstance,
  reactive,
} from 'vue';
import type { PiniaPlugin, PiniaPluginContext } from 'pinia';

const debug = Debug('pinia-hooks-plugin');

type MaybePromise<T> = T | Promise<T>;

let ENABLE_DEVTOOLS = false;
if (import.meta) {
  ENABLE_DEVTOOLS = import.meta.env.DEV;
} else {
  ENABLE_DEVTOOLS = process.env.NODE_ENV === 'development';
}

declare module 'pinia' {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  export interface DefineStoreOptionsBase<S, Store> {
    // adds custom option for activation hook
    onActivated?: (this: Store) => MaybePromise<void | (() => void)>;
    // adds custom option for hook for first init/activation
    onInitialized?: (this: Store) => MaybePromise<void>;
  }
  export interface PiniaCustomStateProperties<S> {
    _trackComponentForHooksPlugin(component: ComponentInternalInstance): void;
  }
}

// TODO: rework types to make generic T happy
export function addStoreHooks<T extends () => any>(useStoreFn: T) {
  return (...args: Parameters<T>): ReturnType<T> => {
    const store = useStoreFn.apply(null, [...args]) as ReturnType<T>;
    const component = getCurrentInstance();
    if (component) store._trackComponentForHooksPlugin(component);
    return store;
  };
}

export const piniaHooksPlugin: PiniaPlugin = (pluginContext: PiniaPluginContext) => {
  const store = pluginContext.store;
  const storeOptions = pluginContext.options;

  function storeDebug(...toLog: Array<any>) {
    debug(`[${store.$id}]`, ...toLog);
  }

  // additional check in case this code is called multiple times
  if (store._trackedComponentsUsingStore) return;

  // track whether the single-time onInitialized hook has been called yet
  store._initHookCalled = false;

  // track components using this store
  store._trackedComponentsUsingStore = reactive<Record<string, boolean>>({});
  store._trackedComponentsUsingStoreCount = computed(() => Object.keys(store._trackedComponentsUsingStore).length);

  // expose to vue/pinia devtools
  if (ENABLE_DEVTOOLS) {
    store._customProperties.add('_trackedComponentsUsingStore');
    store._customProperties.add('_trackedComponentsUsingStoreCount');
  }

  /** tracks a vue component as using the store */
  function trackComponentInternal(
    component: ComponentInternalInstance,
    componentId: string,
  ) {
    // bail if this component is already tracked
    if (store._trackedComponentsUsingStore[componentId]) return;

    storeDebug(`${componentId} tracked`);

    store._trackedComponentsUsingStore[componentId] = true;

    // if we have never called the init hook, we call it here
    if (!store._initHookCalled && storeOptions.onInitialized) {
      storeDebug('calling onInitialized hook');
      // TODO: error handling?
      storeOptions.onInitialized.call(store); // eslint-disable-line @typescript-eslint/no-floating-promises
    }

    // otherwise, if we are going from 0 to 1 component, we call the activated hook
    if (store._trackedComponentsUsingStoreCount === 1 && storeOptions.onActivated) {
      storeDebug('calling onActivated hook');
      // onActivated hook can return a deactivate / cleanup function
      store.onDeactivated = storeOptions.onActivated.call(store);

      // onActivated could be async, so need to resolve if so...
      // TODO: error handling?
      if (isPromise(store.onDeactivated)) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        store.onDeactivated.then((resolvedOnDeactivate) => {
          store.onDeactivated = resolvedOnDeactivate;
        });
      }
    }

    // attach unmounted hook here so it only ever gets added once
    // (we already bailed if component was already tracked)
    const componentAny = component as any;
    // using vue internals here to add a `onBeforeUnmount` hook
    componentAny.bum = componentAny.bum || [];
    componentAny.bum.push(() => {
      storeDebug(`${componentId} un-tracked`);
      if (!store._trackedComponentsUsingStore[componentId]) {
        throw new Error(
          `[${store.$id}] Expected to find ${componentId} in tracked components list`,
        );
      }
      delete store._trackedComponentsUsingStore[componentId];

      // when going from 1 to 0 tracked components, we call deactivation hook
      // (which was returned from activation hook)
      if (
        store._trackedComponentsUsingStoreCount === 0
        && store.onDeactivated
        && isFunction(store.onDeactivated)
      ) {
        storeDebug('calling onDeactivated hook');
        store.onDeactivated.call(store);
      }
    });
  }

  store._trackComponentForHooksPlugin = (component: ComponentInternalInstance) => {
    storeDebug(
      `track ${component.type.__name}`,
      `mounted? ${component.isMounted}`,
      component,
    );

    // we cannot call lifecycle hooks because not all store uses are within a component
    // plus we do not want any watch calls to be automatically cleaned up

    const componentIdForTracking = `${component.type.__name}/${component.uid}`;
    const componentAny = component as any;

    storeDebug(
      `tracking ${componentIdForTracking}`,
      JSON.stringify(store._trackedComponentsUsingStore),
    );
    if (component.isMounted) {
      trackComponentInternal(component, componentIdForTracking);
    } else {
      // using vue internals once again
      // this can happen multiple times, but we handle it in `trackComponentInternal()`
      componentAny.m = componentAny.m || [];
      componentAny.m.push(() => {
        trackComponentInternal(component, componentIdForTracking);
      });
    }
  };

  // TODO: do we need extra reset logic - https://pinia.vuejs.org/core-concepts/plugins.html#Resetting-state-added-in-plugins
};
