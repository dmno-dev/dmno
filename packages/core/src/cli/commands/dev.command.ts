import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import { DmnoCommand } from '../lib/DmnoCommand';
import { ConfigLoaderProcess } from '../lib/loader-process';
import { formatError, formattedValue } from '../lib/formatting';
import { executeCommandWithEnv } from '../lib/execute-command';
import { getCliRunCtx } from '../lib/cli-ctx';

const program = new DmnoCommand('dev')
  .summary('dev / watch mode')
  .description(`
Runs the service in dev mode, and watches for changes and updates as needed.
  `)
  .example('dmno dev', 'Runs the service in dev mode');

program.action(async (opts, more) => {
  const ctx = getCliRunCtx();
  await ctx.configLoader.makeRequest('start-dev-mode');
});

export const DevCommand = program;
