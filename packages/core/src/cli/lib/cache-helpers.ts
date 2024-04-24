import { Command } from 'commander';
import { exitWithErrorMessage } from './error-helpers';
import { getCliRunCtx } from './cli-ctx';

export function addCacheFlags(program: Command) {
  return program
    .option('--skip-cache', 'skips config cache altogether, will not read or write')
    .option('--clear-cache', 'clears the cache before continuing, will write new values to cache')
    .hook('preAction', async (thisCommand, actionCommand) => {
      if (thisCommand.opts().skipCache && thisCommand.opts().clearCache) {
        exitWithErrorMessage(
          'Invalid cli flag combo',
          'Cannot use --skip-cache + --clear-cache at the same time',
        );
      }
      const ctx = getCliRunCtx();
      ctx.configLoader.setCacheMode(
        (thisCommand.opts().skipCache && 'skip')
        || (thisCommand.opts().clearCache && 'clear')
        || true,
      );
    });
}
