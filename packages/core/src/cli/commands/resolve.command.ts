import kleur from 'kleur';
import _ from 'lodash-es';
import { tryCatch } from '@dmno/ts-lib';
import { outdent } from 'outdent';
import boxen from 'boxen';
import { DmnoCommand } from '../lib/dmno-command';

import {
  formatError, formattedValue, getItemSummary, joinAndCompact,
} from '../lib/formatting';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';
import { addCacheFlags } from '../lib/cache-helpers';
import { addWatchMode } from '../lib/watch-mode-helpers';
import { CliExitError } from '../lib/cli-error';
import { checkForConfigErrors, checkForSchemaErrors } from '../lib/check-errors-helpers';

const program = new DmnoCommand('resolve')
  .summary('Loads config schema and resolves config values')
  .description('Loads the resolved config for a service')
  .option('-f,--format <format>', 'format to output resolved config (ex. json)')
  .option('--public', 'only loads public (non-sensitive) values')
  .option('--show-all', 'shows all items, even when config is failing')
  .example('dmno resolve', 'Loads the resolved config for the root service')
  .example('dmno resolve --service service1', 'Loads the resolved config for service1')
  .example('dmno resolve --service service1 --format json', 'Loads the resolved config for service1 in JSON format');

addWatchMode(program); // must be first
addServiceSelection(program);
addCacheFlags(program);


program.action(async (opts: {
  // these args should be handled already by the helpers
  // service?: string,
  // watch?: boolean,
  // skipCache?: boolean,
  // clearCache?: boolean,

  format?: string,
  public?: boolean,
  showAll?: boolean,
}, thisCommand) => {
  const ctx = getCliRunCtx();

  if (opts.format) ctx.expectingOutput = true;

  if (!ctx.selectedService) return; // error message already handled

  ctx.log(`\nResolving config for service ${kleur.magenta(ctx.selectedService.serviceName)}\n`);

  const workspace = ctx.workspace!;
  const service = ctx.selectedService;
  checkForSchemaErrors(workspace);
  await service.resolveConfig();
  checkForConfigErrors(service, { showAll: opts?.showAll });

  // console.log(service.config);
  if (opts.format === 'json') {
    let exposedConfig = service.config;
    if (opts.public) {
      exposedConfig = _.pickBy(exposedConfig, (c) => !c.type.getDefItem('sensitive'));
    }
    const valuesOnly = _.mapValues(exposedConfig, (val) => val.resolvedValue);

    console.log(JSON.stringify(valuesOnly));
  } else if (opts.format === 'json-full') {
    // TODO: this includes sensitive info when using --public option
    console.dir(service.toJSON(), { depth: null });
  } else if (opts.format === 'json-injected') {
    console.log(JSON.stringify(service.getInjectedEnvJSON()));
  } else {
    _.each(service.config, (item) => {
      console.log(getItemSummary(item.toJSON()));
    });
  }
});

export const ResolveCommand = program;
