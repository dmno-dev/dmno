import { InjectedDmnoEnv } from '../config-engine/config-engine';
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
    response: { serviceDetails: SerializedService, injectedEnv: InjectedDmnoEnv },
  },
  'generate-types': {
    payload: { serviceName?: string },
    response: { tsSrc: string },
  },
};
