import kleur from 'kleur';
import _ from 'lodash-es';
import { tryCatch } from '@dmno/ts-lib';
import { DmnoCommand } from '../lib/dmno-command';
import { formatError, formattedValue } from '../lib/formatting';
import { executeCommandWithEnv } from '../lib/execute-command';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';
import { generateServiceTypes } from '../../config-engine/type-generation';

const program = new DmnoCommand('types')
  .summary('generate types for a service')
  .description('Generate TS types for the config')
  .addHelpText('after', `
More stuff!
`);

addServiceSelection(program, false);

program.action(async (opts: {
  service?: string,
}, more) => {
  const ctx = getCliRunCtx();

  const workspace = await tryCatch(async () => {
    return await ctx.configLoader.getWorkspace();
  }, (err) => {
    console.log(kleur.red().bold('Loading config failed'));
    console.log(err.message);
    process.exit(1);
  });


  if (opts.service) {
    // generate types for the single service
  } else {
    // generate types for all services
  }

  process.exit(0);
});

export const RunCommand = program;
