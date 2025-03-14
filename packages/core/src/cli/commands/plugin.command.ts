import { fork } from 'child_process';
import kleur from 'kleur';
import * as _ from 'lodash-es';
import Debug from 'debug';
import { tryCatch } from '@dmno/ts-lib';

import { DmnoCommand } from '../lib/dmno-command';
import { getCliRunCtx } from '../lib/cli-ctx';
import { addServiceSelection, addPluginSelection } from '../lib/selection-helpers';
import { CliExitError } from '../lib/cli-error';

const debug = Debug('dmno:plugin-cli');

const program = new DmnoCommand('plugin')
  .summary('Interacts with dmno plugins')
  .description('Runs CLI commands related to a specific plugin instance')
  .example('dmno plugin -p my-plugin', 'Runs the CLI for the my-plugin plugin')
  .example('dmno plugin -p my-plugin -s my-service', 'Runs the CLI for the my-plugin plugin with the my-service service');

addServiceSelection(program, { });
addPluginSelection(program);

let isTerminating = false;
program.action(async (opts: {
  plugin: string,
  service?: string,
}, more) => {
  const ctx = getCliRunCtx();
  if (!ctx.selectedPlugin) {
    throw new CliExitError('No plugin instance selected');
  }

  let cliPath = ctx.selectedPlugin.cliPath;

  if (!cliPath) throw new Error('no cli for this plugin!');
  // TODO: might want to look for .js and .mjs?
  if (!cliPath.endsWith('.js')) cliPath += '.js';

  // console.log(more.args);

  const pluginCliProcess = fork(cliPath, more.args, { stdio: 'inherit' });
  debug('PARENT PROCESS = ', process.pid);
  debug('CHILD PROCESS = ', pluginCliProcess.pid);

  // make sure we kill the child if the parent is about to die
  process.on('exit', (code) => {
    debug(`About to exit with code: ${code}`);
    pluginCliProcess.kill(9);
  });
  // TODO: handle other signals?
  process.on('SIGTERM', () => {
    isTerminating = true;
    pluginCliProcess.kill(9);
    process.exit(1);
  });

  // pluginCliProcess.on('message', (childPluginMessage) => {
  //   console.log('child cli message', childPluginMessage);
  // });

  pluginCliProcess.on('close', (code, signal) => {
    if (!isTerminating) process.exit(code || 1);
  });

  pluginCliProcess.on('disconnect', () => {
    debug('child cli disconnect');
    // process.exit(1);
  });

  pluginCliProcess.on('error', (err) => {
    debug('child cli process error', err);
    // process.exit(0);
  });

  pluginCliProcess.on('exit', (code, signal) => {
    debug('child cli process exit', code, signal);
    if (!isTerminating) process.exit(code || 1);
  });

  // pluginCliProcess.on('spawn', () => {
  //   console.log('child cli process spawn');
  // });


  // reload the workspace and resolve values
  const workspace = await tryCatch(async () => {
    return await ctx.dmnoServer.getWorkspace();
  }, (err) => {
    console.log(kleur.red().bold('Loading config failed'));
    console.log(err.message);
    process.exit(1);
  });

  //! await workspace.resolveConfig();
  const resolvedPlugin = workspace.plugins[opts.plugin!];

  pluginCliProcess.send(['init', {
    workspace,
    plugin: resolvedPlugin,
    selectedServiceName: opts.service,
  }]);
});

export const PluginCommand = program;
