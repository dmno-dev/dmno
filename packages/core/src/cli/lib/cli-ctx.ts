import { AsyncLocalStorage } from 'node:async_hooks';
import { l } from 'vite/dist/node/types.d-FdqQ54oU';
import { ConfigLoaderProcess } from './loader-process';
import { SerializedDmnoPlugin, SerializedService, SerializedWorkspace } from '../../config-loader/serialization-types';

type CliRunCtx = {
  configLoader: ConfigLoaderProcess;
  workspace?: SerializedWorkspace;
  selectedService?: SerializedService,
  selectedPlugin?: SerializedDmnoPlugin,
};

export const cliRunContext = new AsyncLocalStorage<CliRunCtx>();

export function initCliRunCtx() {
  cliRunContext.enterWith({
    // not sure about this...
    configLoader: new ConfigLoaderProcess(),
  });
}


export function getCliRunCtx() {
  const ctx = cliRunContext.getStore();
  if (!ctx) throw new Error('unable to find cli run context in ALS');
  return ctx;
}
