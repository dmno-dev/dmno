import { Command } from 'commander';
import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import { ConfigLoaderProcess } from '../lib/loader-process';
import { formatError, formattedValue } from '../lib/formatting';
import { executeCommandWithEnv } from '../lib/execute-command';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';

const program = new Command('run')
  .summary('inject loaded config into an external command')
  .description('Run a command with the resolved config for a service')
  .usage('[options] -- [command to pass config to]')
  .argument('external command')
  .addHelpText('after', `
More stuff!
`);

addServiceSelection(program);


program.action(async (_command, opts, more) => {
  const ctx = getCliRunCtx();

  const config = await ctx.configLoader.makeRequest('get-resolved-config', {
    serviceName: opts.service,
  });

  const commandArgs = more.args;
  await executeCommandWithEnv(commandArgs, config);
  process.exit(0);
});

export const RunCommand = program;
