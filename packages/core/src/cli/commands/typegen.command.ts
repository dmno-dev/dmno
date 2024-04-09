import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import { DmnoCommand } from '../lib/DmnoCommand';
import { ConfigLoaderProcess } from '../lib/loader-process';
import { formatError, formattedValue } from '../lib/formatting';
import { executeCommandWithEnv } from '../lib/execute-command';
import { addServiceSelection } from '../lib/selection-helpers';

const program = new DmnoCommand('types')
  .summary('generate types for a service')
  .description('Generate TS types for the config')
  .addHelpText('after', `
More stuff!
`);

addServiceSelection(program, false);

program.action(async (opts, more) => {
  const configLoader = new ConfigLoaderProcess();

  // TODO: support generating types for all services?
  const config = await configLoader.makeRequest('generate-types', {
    serviceName: opts.service,
  });

  const commandArgs = more.args;
  await executeCommandWithEnv(commandArgs, config);
  process.exit(0);
});

export const RunCommand = program;
