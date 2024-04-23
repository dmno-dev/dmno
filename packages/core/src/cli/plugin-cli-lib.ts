import { readFileSync } from 'node:fs';
import { Command, Option } from 'commander';
import { createDeferredPromise } from '@dmno/ts-lib';
import Debug from 'debug';
import kleur from 'kleur';

import { SerializedDmnoPlugin, SerializedWorkspace } from '../config-loader/serialization-types';

// re-export kleur so the child cli does not have to declare dependency
export { default as kleur } from 'kleur';

// this helps with some weird TS issues even though the child cli will not use directly
// see https://github.com/microsoft/TypeScript/issues/42873
export { Command, Option } from 'commander';



const debug = Debug('dmno:plugin-cli');


type PluginCliDmnoCtx = {
  workspace: SerializedWorkspace,
  plugin: SerializedDmnoPlugin,
  selectedServiceName?: string,
};

export function createDmnoPluginCli(opts: {
  commands: Array<Command>,
}): Command {
  let workspace: SerializedWorkspace;
  let plugin: SerializedDmnoPlugin;
  let selectedServiceName: string | undefined;

  // do some process initialization to handle clean shutdowns
  // and IPC with the parent CLI
  process.on('message', (message: any) => {
    debug('received message from parent cli', message);
    const [messageType, payload] = message;
    if (messageType === 'init') {
      workspace = payload.workspace;
      plugin = payload.plugin;
      selectedServiceName = payload.selectedServiceName;

      isReady.resolve();
    }
  });
  process.on('exit', () => {
    debug('child cli is exiting');
  });

  // TODO: handle other signals
  process.on('SIGTERM', () => {
    debug('child process SIGTERM');
    process.exit(1);
  });
  process.on('SIGINT', () => {
    debug('child process SIGINT');
    process.exit(1);
  });

  const isReady = createDeferredPromise();

  // reading name from package.json file
  // TODO: maybe we can inject the plugin name somehow during the build process?
  const errStack = new Error().stack!.split('\n');
  const packagePath = errStack[2].replace(/.* at file:\/\//, '').replace(/\/dist\/.*$/, '');
  const packageJsonPath = `${packagePath}/package.json`;
  const packageJsonStr = readFileSync(packageJsonPath, 'utf-8');
  const packageJson: { name: string } = JSON.parse(packageJsonStr);
  const packageName = packageJson.name;

  const program = new Command('dmno plugin -p [pluginName] --')
    .description(`${packageName} cli`)
    .hook('preSubcommand', async (thisCommand, actionCommand) => {
      // wait for our "init" message to come over the fork IPC
      await isReady.promise;

      // attach workspace/plugin info onto the command
      // TODO: we could use AsyncLocalStorage for this, but this seems fine since it is contained to this file
      (actionCommand as any).dmnoPluginCliCtx = {
        workspace,
        plugin,
        selectedServiceName,
      } satisfies PluginCliDmnoCtx;
    });
  opts.commands.forEach((c) => program.addCommand(c));
  return program;
}


export function createDmnoPluginCliCommand(commandSpec: {
  name: string,
  alias?: string,
  summary: string,
  description: string,
  options?: Array<Option>,
  handler: (
    ctx: PluginCliDmnoCtx,
    opts: any,
    command: any,
  ) => Promise<void>,
}): Command {
  const commandProgram = new Command(commandSpec.name)
    .summary(commandSpec.summary)
    .description(commandSpec.description);
  if (commandSpec.alias?.length) {
    commandProgram.alias(commandSpec.alias);
  }
  if (commandSpec?.options?.length) {
    commandSpec.options.forEach((o) => commandProgram.addOption(o));
  }

  commandProgram.action(async (opts, thisCommand) => {
    const pluginCtx = (thisCommand as any).dmnoPluginCliCtx as PluginCliDmnoCtx;

    await commandSpec.handler(pluginCtx, opts, thisCommand);
  });
  return commandProgram;
}
