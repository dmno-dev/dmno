import fs from 'node:fs';
import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import { tryCatch } from '@dmno/ts-lib';
import { findDmnoServices } from '../../config-loader/find-services';
import { DmnoCommand } from '../lib/DmnoCommand';

import { formatError, formattedValue } from '../lib/formatting';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';

const TERMINAL_COLS = process.stdout.columns - 10 || 100;

const program = new DmnoCommand('init')
  .summary('Sets up dmno')
  .description('Sets up dmno in your repo, and can help add to new packages within your monorepo - safe to run multiple times')
  .example('dmno init', 'Set up dmno and uses interactive menus to make selections');


program.action(async (opts: {
}, thisCommand) => {
  const workspaceInfo = await findDmnoServices();


  if (!workspaceInfo.workspacePackages[0].dmnoFolder) {
    console.log('First let\'s set up your root dmno folder');
    // create dmno folder
    await fs.promises.mkdir(`${workspaceInfo.workspacePackages[0].path}/.dmno`);

    // create config.mts
    // create tsconfig.json
    // create .env.local
  }



  // check root gitignore
  const addGitIgnoreEntries = `
# local cache for resolved values
**/.dmno/cache.json
# encryption key used for cache
**/.dmno/cache-key.json
# generated type files
**/.dmno/.typegen
# iconify cache used in generated types
**/.dmno/.icon-cache
# local config overrides
.env.local
`;


  console.log(workspaceInfo);


  process.exit(0);
});

export const LoadCommand = program;
