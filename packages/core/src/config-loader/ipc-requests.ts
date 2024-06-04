import { SerializedService, SerializedWorkspace } from './serialization-types';

export type ConfigLoaderRequestMap = {
  'load-full-schema': {
    payload: undefined | { resolve?: boolean },
    response: SerializedWorkspace,
  },
  'get-resolved-config': {
    payload: {
      serviceName?: string,
      packageName?: string,
    },
    response: SerializedService,
  },
  'generate-types': {
    payload: { serviceName?: string },
    response: { tsSrc: string },
  },
};
