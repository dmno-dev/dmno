import kleur from 'kleur';
import * as _ from 'lodash-es';

import { DmnoCommand } from '../lib/dmno-command';
import { getItemSummary } from '../lib/formatting';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';
import { addCacheFlags } from '../lib/cache-helpers';
import { addWatchMode } from '../lib/watch-mode-helpers';
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

  // this logic could probably move to the service itself?
  function getExposedConfigValues() {
    const values = {} as Record<string, any>;
    for (const itemKey in service.configNodes) {
      const item = service.configNodes[itemKey];
      // --public option skips anything sensitive
      if (item.isSensitive && opts.public) continue;
      values[itemKey] = item.resolvedValue;
    }
    return values;
  }

  // when we are using the non default format (which includes everything) we have the same questions
  // here about what values to include, and how to handle env var keys that may be renamed
  // probably need a flag to select which we are talking about

  // console.log(service.config);
  if (opts.format === 'json') {
    console.log(JSON.stringify(getExposedConfigValues()));
  } else if (opts.format === 'debug') {
    console.dir(service, { depth: null });
  } else if (opts.format === 'json-full') {
    console.log(JSON.stringify(service));
  } else if (opts.format === 'json-injected') {
    const { injectedDmnoEnv } = await ctx.dmnoServer.makeRequest('getServiceResolvedConfig', ctx.selectedService.serviceName);
    console.log(JSON.stringify(injectedDmnoEnv));
  } else if (opts.format === 'env') {
    console.log(stringifyObjectAsEnvFile(getExposedConfigValues()));
  } else {
    _.each(service.configNodes, (item) => {
      console.log(getItemSummary(item));
    });
  }
});

export const ResolveCommand = program;
