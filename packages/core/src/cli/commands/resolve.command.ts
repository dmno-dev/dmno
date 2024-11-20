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
import { checkForConfigErrors, checkForSchemaErrors } from '../../config-engine/check-errors-helpers';
import { stringifyObjectAsEnvFile } from '../lib/env-file-helpers';
import { isSubshell } from '../lib/shell-helpers';
import { addResolutionPhaseFlags } from '../lib/resolution-context-helpers';

const program = new DmnoCommand('resolve')
  .summary('Loads config schema and resolves config values')
  .description('Loads the resolved config for a service')
  .option('-f,--format <format>', 'format to output resolved config (ex. json)')
  .option('--public', 'only loads public (non-sensitive) values')
  .option('--show-all', 'shows all items, even when config is failing')
  .example('dmno resolve', 'Loads the resolved config for the root service')
  .example('dmno resolve --service service1', 'Loads the resolved config for service1')
  .example('dmno resolve --service service1 --format json', 'Loads the resolved config for service1 in JSON format')
  .example('dmno resolve --service service1 --format env', 'Loads the resolved config for service1 and outputs it in .env file format')
  .example('dmno resolve --service service1 --format env >> .env.local', 'Loads the resolved config for service1 and outputs it in .env file format and writes to .env.local');

addWatchMode(program); // must be first
addResolutionPhaseFlags(program);
addCacheFlags(program);
addServiceSelection(program, { disablePrompt: isSubshell() });

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
  checkForConfigErrors(service, { showAll: opts?.showAll });

  async function getExposedConfigValues() {
    const injectedJson = await ctx.dmnoServer.makeRequest('getInjectedJson', service.serviceName);
    let exposedConfig = service.configNodes;
    const values = {} as Record<string, any>;
    for (const itemKey in injectedJson) {
      if (itemKey.startsWith('$')) continue;
      if (injectedJson[itemKey].value && opts.public) continue;
      values[itemKey] = injectedJson[itemKey].value;
    }
    return values;
  }

  // console.log(service.config);
  if (opts.format === 'json') {
    console.log(JSON.stringify(getExposedConfigValues()));
  } else if (opts.format === 'json-full') {
    console.dir(service, { depth: null });
  } else if (opts.format === 'json-injected') {
    const injectedJson = await ctx.dmnoServer.makeRequest('getInjectedJson', ctx.selectedService.serviceName);
    console.log(JSON.stringify(injectedJson));
  } else if (opts.format === 'env') {
    console.log(stringifyObjectAsEnvFile(getExposedConfigValues()));
  } else {
    _.each(service.configNodes, (item) => {
      console.log(getItemSummary(item));
    });
  }
});

export const ResolveCommand = program;
