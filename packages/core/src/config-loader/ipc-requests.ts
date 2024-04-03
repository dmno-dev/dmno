import { SerializedService, SerializedWorkspace } from './serialization-types';

export type ConfigLoaderRequestMap = {
  'load-full-schema': {
    payload: undefined,
    response: SerializedWorkspace,
  },
  'get-resolved-config': {
    payload: {
      serviceName?: string,
    },
    response: SerializedService,
  },
  'generate-types': {
    payload: { serviceName?: string },
    response: { tsSrc: string },
  },
  'start-dev-mode': {
    payload: undefined,
    response: { success: boolean }
  }

};
