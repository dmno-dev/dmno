import { SerializedConfigItem, SerializedService, SerializedWorkspace } from './serialization-types';

export type ConfigLoaderRequestMap = {
  'load-full-schema': {
    payload: undefined,
    response: SerializedWorkspace,
  },
  'get-resolved-config': {
    payload: { serviceName?: string, packageName?: string },
    response: SerializedService,
  },
  'generate-types': {
    payload: { serviceName?: string, packageName?: string },
    response: { tsSrc: string },
  },
  'start-dev-mode': {
    payload: undefined,
    response: { success: boolean }
  }

};

type ConfigLoaderRequest = {
  [K in keyof ConfigLoaderRequestMap]: (
    { key: K } & ConfigLoaderRequestMap[K]
  )
}[keyof ConfigLoaderRequestMap];
