import kleur from 'kleur';
import _ from 'lodash-es';
import { DmnoCommand } from '../lib/dmno-command';

import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';
import { addCacheFlags } from '../lib/cache-helpers';
import { addWatchMode } from '../lib/watch-mode-helpers';
import { CliExitError } from '../lib/cli-error';
import { checkForConfigErrors, checkForSchemaErrors } from '../../config-engine/check-errors-helpers';


const program = new DmnoCommand('printenv')
  .summary('Print a single config value')
  .description('Resolves the config and then prints a single value')
  .argument('<itemPath>')
  .example('dmno printenv SOME_KEY', 'resolves config and prints the value of the single item');

addWatchMode(program); // must be first
addCacheFlags(program);
addServiceSelection(program);

program.action(async (itemPath: string, opts: {}, thisCommand) => {
  const ctx = getCliRunCtx();

  ctx.expectingOutput = true;

  if (!ctx.selectedService) return; // error message already handled

  const workspace = ctx.workspace!;
  const service = ctx.selectedService;
  const resolvedConfig = service.configNodes;

  checkForSchemaErrors(workspace);
  checkForConfigErrors(service);

  // TODO: process env version or dmno env? what if the key is renamed as an env var? flag to select?
  // TODO: could be smarter about not caring about errors unless they affect the item(s) being printed
  // TODO: support nested paths
  // TODO: do we want to support multiple items?

  const { injectedProcessEnv } = await ctx.dmnoServer.makeRequest('getServiceResolvedConfig', service.serviceName);

  if (!(itemPath in injectedProcessEnv)) {
    throw new CliExitError(`Config item ${itemPath} not found in config schema`, {
      details: [
        'Perhaps you meant one of:',
        ..._.map(resolvedConfig, (val, key) => `${kleur.gray('-')} ${key}`),
      ],
    });
  }

  // TODO: what to do about formatting of arrays/objects/etc
  // now just print the resolved value
  ctx.logOutput(injectedProcessEnv[itemPath]);
});

export const PrintEnvCommand = program;
