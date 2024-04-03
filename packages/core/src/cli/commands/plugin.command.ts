import { execSync } from 'child_process';
import { Command } from 'commander';
import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import { select } from '@inquirer/prompts';
import { ExecaChildProcess, execa } from 'execa';
import which from 'which';
import { ConfigLoaderProcess } from '../lib/loader-process';
import { formatError, formattedValue } from '../lib/formatting';
import { executeCommandWithEnv } from '../lib/execute-command';
import { fallingDmnoLoader } from '../lib/loaders';
import { getCliRunCtx } from '../lib/cli-ctx';
import { addServiceSelection, addPluginSelection } from '../lib/selection-helpers';
import { SerializedDmnoPlugin } from '../../config-loader/serialization-types';

const program = new Command('plugin')
  .summary('interact with dmno plugins')
  .description('Run a command with the resolved config for a service');

addServiceSelection(program, false);
addPluginSelection(program);


program.action(async (opts: {
  plugin?: string,
  service?: string,
}, more) => {
  const ctx = getCliRunCtx();
  const workspace = ctx.workspace!;
  const plugin = ctx.selectedPlugin!;

  let cliPath = plugin.cliPath;

  if (!cliPath) throw new Error('no cli for this plugin!');
  if (!cliPath.endsWith('.mjs')) cliPath += '.mjs';

  // console.log(more.args);

  const pathAwareNode = await which('node', { nothrow: true });
  await execa(pathAwareNode, [cliPath, ...more.args], { stdio: 'inherit' });


  // const commandArgs = more.args;
  // await executeCommandWithEnv(commandArgs, config);
  process.exit(0);
});

export const PluginCommand = program;
