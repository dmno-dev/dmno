import { AsyncLocalStorage } from 'node:async_hooks';
import { SerializedDmnoPlugin, SerializedService, SerializedWorkspace } from '../../config-loader/serialization-types';
import { ConfigLoader } from '../../config-loader/config-loader';
import { DmnoService, DmnoWorkspace } from '../../config-engine/config-engine';
import { DmnoPlugin } from '../../config-engine/plugins';

type CliRunCtx = {
  // configLoader: ConfigLoaderProcess;
  configLoader: ConfigLoader;
  workspace?: DmnoWorkspace;
  selectedService?: DmnoService,
  selectedPlugin?: DmnoPlugin,
};

export const cliRunContext = new AsyncLocalStorage<CliRunCtx>();

export function initCliRunCtx() {
  cliRunContext.enterWith({
    // not sure about this...
    // configLoader: new ConfigLoaderProcess(),
    configLoader: new ConfigLoader(),
  });
}


export function getCliRunCtx() {
  const ctx = cliRunContext.getStore();
  if (!ctx) throw new Error('unable to find cli run context in ALS');
  return ctx;
}
