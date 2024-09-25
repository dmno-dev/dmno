import { Command } from 'commander';
import { getCliRunCtx } from './cli-ctx';
import { CliExitError } from './cli-error';

export function addCacheFlags(program: Command) {
  return program
    .option('--skip-cache', 'skips config cache altogether, will not read or write')
    .option('--clear-cache', 'clears the cache before continuing, will write new values to cache')
    .hook('preAction', async (thisCommand, actionCommand) => {
      if (thisCommand.opts().skipCache && thisCommand.opts().clearCache) {
        throw new CliExitError('Invalid cli flag combo', {
          details: 'Cannot use --skip-cache + --clear-cache at the same time',
          forceExit: true,
        });
      }
      const ctx = getCliRunCtx();
      ctx.configLoader.cacheMode = (
        (thisCommand.opts().skipCache && 'skip')
        || (thisCommand.opts().clearCache && 'clear')
        || true
      );
    });
}
