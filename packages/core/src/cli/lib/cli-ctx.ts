import { AsyncLocalStorage } from 'node:async_hooks';
import { ConfigLoader } from '../../config-loader/config-loader';
import { DmnoService, DmnoWorkspace } from '../../config-engine/config-engine';
import { DmnoPlugin } from '../../config-engine/plugins';

export type CliRunCtx = {
  configLoader: ConfigLoader;
  workspace?: DmnoWorkspace;
  selectedService?: DmnoService,
  autoSelectedService?: boolean,
  selectedPlugin?: DmnoPlugin,

  /** true if watch mode is enabled */
  watchEnabled?: boolean,
  isWatchModeRestart?: boolean,
  /**
   * true if the command is meant to output strict formatted output (like JSON)
   * used in combination with logging helper to silence additional output
   * */
  expectingOutput?: boolean,


  // helpers - have to manually add types to avoid circular problems
  /** log that swallows if command is expecting strictly formatted output (like JSON) */
  log: typeof console.log;
  /** log that always runs, meant to be called by anything that spits out strict formatted output */
  logOutput: typeof console.log;
};

const ctxHelpers = {
  log(this: CliRunCtx, ...strs: Array<string>) {
    if (!this.expectingOutput) {
      console.log(...strs);
    }
  },
  logOutput(this: CliRunCtx, ...strs: Array<string>) {
    console.log(...strs);
  },
};

export const cliRunContext = new AsyncLocalStorage<CliRunCtx>();

export function initCliRunCtx() {
  cliRunContext.enterWith({
    // not sure about this...
    // configLoader: new ConfigLoaderProcess(),
    configLoader: new ConfigLoader(),
    ...ctxHelpers,
  });
}


export function getCliRunCtx() {
  const ctx = cliRunContext.getStore();
  if (!ctx) throw new Error('unable to find cli run context in ALS');
  return ctx;
}
