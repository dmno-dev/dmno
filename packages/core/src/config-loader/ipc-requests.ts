import { SerializedConfigItem, SerializedService } from './serialization-types';

export type ConfigLoaderRequestMap = {
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
    response: { success: true }
  }

};

type ConfigLoaderRequest = {
  [K in keyof ConfigLoaderRequestMap]: (
    { key: K } & ConfigLoaderRequestMap[K]
  )
}[keyof ConfigLoaderRequestMap];
