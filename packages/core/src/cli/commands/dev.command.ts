import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import { DmnoCommand } from '../lib/DmnoCommand';
import { formatError, formattedValue } from '../lib/formatting';
import { executeCommandWithEnv } from '../lib/execute-command';
import { getCliRunCtx } from '../lib/cli-ctx';
import { ConfigServer } from '../../config-loader/config-server';

const program = new DmnoCommand('dev')
  .summary('dev / watch mode')
  .description(`
Runs the service in dev mode, and watches for changes and updates as needed.
  `)
  .example('dmno dev', 'Runs the service in dev mode');

program.action(async (opts, more) => {
  const ctx = getCliRunCtx();

  const configServer = new ConfigServer(ctx.configLoader);

  ctx.configLoader.devMode = true;
  await ctx.configLoader.getWorkspace();
  console.log('dev mode running...');

  // console.log(ctx.configLoader.uuid);
});

export const DevCommand = program;
