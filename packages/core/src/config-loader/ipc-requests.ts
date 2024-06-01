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
    response: SerializedService,
  },
  'get-resolved-config-for-inject': {
    payload: {
      serviceName?: string,
      packageName?: string,
    },
    response: InjectedDmnoEnv,
  },
  'generate-types': {
    payload: { serviceName?: string },
    response: { tsSrc: string },
  },
};
