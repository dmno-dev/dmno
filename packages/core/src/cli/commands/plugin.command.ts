import { execSync, fork } from 'child_process';
import { inherits } from 'util';
import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import { select } from '@inquirer/prompts';
import { ExecaChildProcess, execa } from 'execa';
import which from 'which';
import Debug from 'debug';
import { tryCatch } from '@dmno/ts-lib';
import { DmnoCommand } from '../lib/DmnoCommand';
import { formatError, formattedValue } from '../lib/formatting';
import { executeCommandWithEnv } from '../lib/execute-command';
import { fallingDmnoLoader } from '../lib/loaders';
import { getCliRunCtx } from '../lib/cli-ctx';
import { addServiceSelection, addPluginSelection } from '../lib/selection-helpers';
import { SerializedDmnoPlugin } from '../../config-loader/serialization-types';

const debug = Debug('dmno:plugin-cli');

const program = new DmnoCommand('plugin')
  .summary('Interacts with dmno plugins')
  .description('Runs CLI commands related to a specific plugin instance')
  .example('dmno plugin -p my-plugin', 'Runs the CLI for the my-plugin plugin')
  .example('dmno plugin -p my-plugin -s my-service', 'Runs the CLI for the my-plugin plugin with the my-service service');

addServiceSelection(program, false);
addPluginSelection(program);

let isTerminating = false;
program.action(async (opts: {
  plugin: string,
  service?: string,
}, more) => {
  const ctx = getCliRunCtx();
  if (!ctx.selectedPlugin) {
    console.log('did not select plugin');
    process.exit(1);
  }

  let cliPath = ctx.selectedPlugin.cliPath;

  if (!cliPath) throw new Error('no cli for this plugin!');
  if (!cliPath.endsWith('.mjs')) cliPath += '.mjs';

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
    return await ctx.configLoader.getWorkspace();
  }, (err) => {
    console.log(kleur.red().bold('Loading config failed'));
    console.log(err.message);
    process.exit(1);
  });

  await workspace.resolveConfig();
  const resolvedPlugin = workspace.plugins[opts.plugin!];

  pluginCliProcess.send(['init', {
    workspace: workspace.toJSON(),
    plugin: resolvedPlugin.toJSON(),
    selectedServiceName: opts.service,
  }]);



  // await execa(pathAwareNode, [cliPath, ...more.args], { stdio: 'inherit' });


  // const commandArgs = more.args;
  // await executeCommandWithEnv(commandArgs, config);
  // process.exit(0);
});

export const PluginCommand = program;
