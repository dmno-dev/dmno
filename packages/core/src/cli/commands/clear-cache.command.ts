import fs from 'node:fs/promises';
import kleur from 'kleur';
import _ from 'lodash-es';
import { outdent } from 'outdent';
import { DmnoCommand } from '../lib/dmno-command';
import { formatError, formattedValue, getItemSummary } from '../lib/formatting';
import { getCliRunCtx } from '../lib/cli-ctx';
import { ConfigServer } from '../../config-loader/config-server';
import { addCacheFlags } from '../lib/cache-helpers';
import { addServiceSelection } from '../lib/selection-helpers';
import { fallingDmnoLoader, fallingDmnosAnimation } from '../lib/loaders';
import { pathExists } from '../../config-loader/find-services';

const program = new DmnoCommand('clear-cache')
  .summary('cache utils')
  .description(outdent`
    Tools to clear / reset the cache

    Also note many commands have \`--skip-cache\` and \`--clear-cache\` flags
  `)
  .example('dmno clear-cache', 'Clear the entire cache');
  // .example('dmno cache clear -s web', 'Clear items from the cache used by the "web" service only');


// addServiceSelection(program);

program.action(async (opts, more) => {
  const ctx = getCliRunCtx();
  const workspace = await ctx.configLoader.getWorkspace();

  if (!await pathExists(workspace.cacheFilePath)) {
    console.log('👻 Workspace cache file already gone!\n');
    process.exit(0);
  }


  await fs.rm(workspace.cacheFilePath);
  console.log('🧲💾 Workspace cache file erased');
  console.log(kleur.italic().gray(workspace.cacheFilePath));
  console.log();

  process.exit(0);
});

export const ClearCacheCommand = program;
