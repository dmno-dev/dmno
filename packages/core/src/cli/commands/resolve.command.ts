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
import { stringifyObjectAsEnvFile } from '../lib/env-file-helpers';
import { isSubshell } from '../lib/shell-helpers';

const program = new DmnoCommand('resolve')
  .summary('Loads config schema and resolves config values')
  .description('Loads the resolved config for a service')
  .option('-f,--format <format>', 'format to output resolved config (ex. json)')
  .option('--public', 'only loads public (non-sensitive) values')
  .option('--show-all', 'shows all items, even when config is failing')
  .option('--silent', 'automatically select defaults and do not prompt for any input')
  .example('dmno resolve', 'Loads the resolved config for the root service')
  .example('dmno resolve --service service1', 'Loads the resolved config for service1')
  .example('dmno resolve --service service1 --format json', 'Loads the resolved config for service1 in JSON format')
  .example('dmno resolve --service service1 --format env', 'Loads the resolved config for service1 and outputs it in .env file format')
  .example('dmno resolve --service service1 --format env >> .env.local', 'Loads the resolved config for service1 and outputs it in .env file format and writes to .env.local');

addWatchMode(program); // must be first
addCacheFlags(program);
addServiceSelection(program);


program.action(async (opts: {
  // these args should be handled already by the helpers
  // service?: string,
  // watch?: boolean,
  // skipCache?: boolean,
  // clearCache?: boolean,

  format?: string,
  public?: boolean,
  showAll?: boolean,
  silent?: boolean,
}, thisCommand) => {
  const ctx = getCliRunCtx();

  const isSilent = !!opts.silent || isSubshell();

  if (opts.format) ctx.expectingOutput = true;

  if (!ctx.selectedService && !isSilent) return; // error message already handled


  ctx.log(`\nResolving config for service ${kleur.magenta(ctx.selectedService.serviceName)}\n`);

  const workspace = ctx.workspace!;
  const service = ctx.selectedService;
  checkForSchemaErrors(workspace);
  await workspace.resolveConfig();
  checkForConfigErrors(service, { showAll: opts?.showAll });

  const getExposedConfigValues = () => {
    let exposedConfig = service.config;
    if (opts.public) {
      exposedConfig = _.pickBy(exposedConfig, (c) => !c.type.getMetadata('sensitive'));
    }
    return _.mapValues(exposedConfig, (val) => val.resolvedValue);
  };

  // console.log(service.config);
  if (opts.format === 'json') {
    console.log(JSON.stringify(getExposedConfigValues()));
  } else if (opts.format === 'json-full') {
    console.dir(service.toJSON(), { depth: null });
  } else if (opts.format === 'json-injected') {
    console.log(JSON.stringify(service.configraphEntity.getInjectedEnvJSON()));
  } else if (opts.format === 'env') {
    console.log(stringifyObjectAsEnvFile(getExposedConfigValues()));
  } else {
    _.each(service.config, (item) => {
      console.log(getItemSummary(item.toJSON()));
    });
  }
});

export const ResolveCommand = program;
