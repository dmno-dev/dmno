import { Command } from 'commander';
import kleur from 'kleur';
import { CliRunCtx, getCliRunCtx } from './cli-ctx';
import { CliExitError } from './cli-error';


export const WATCHING_FILES_MESSAGE = [
  '',
  kleur.gray('👀 watching your config files for changes... (CTRL+C to exit)'),
].join('\n');

let isRerunInProgress = false;
let enqueueRerun = false;


async function rerunCliAction(ctx: CliRunCtx, thisCommand: Command) {
  console.log(kleur.blue().italic('reloading due to config change'));

  ctx.workspace = await ctx.dmnoServer.getWorkspace();

  // going to try to re-execute the command's action handler
  // probably a bad idea... but let's try it?
  // as long as we follow similar patterns for any watch-enabled commands, we may be fine

  // we track that this is a re-run, so actions and hooks can alter their behaviour if necessary
  ctx.isWatchModeRestart = true;

  // we'll re-run our lifecycle hooks, which means they must be aware of how to handle being run multiple times
  // usually this means just skipping unless something specific is going on

  // rerun pre-hooks
  for (const preHook of (thisCommand as any)._lifeCycleHooks.preAction) {
    // if the hook exited we stop the rest
    await preHook(thisCommand);
  }
  // re-run the action handler
  await (thisCommand as any)._actionHandler(thisCommand.processedArgs);

  // rerun post-hooks
  for (const postHook of (thisCommand as any)._lifeCycleHooks.postAction) {
    await postHook(thisCommand.processedArgs);
  }



  // isRerunInProgress = false;
  // if (enqueueRerun) {
  //   enqueueRerun = false;
  //   await rerunCliAction(ctx, thisCommand);
  // }
}


export function addWatchMode(program: Command) {
  program
    .option('-w,--watch', 'watch for config changes and re-run')
    .hook('preAction', async (thisCommand, actionCommand) => {
      const ctx = getCliRunCtx();
      if (ctx.isWatchModeRestart) return;

      ctx.watchEnabled = thisCommand.opts().watch;
      if (!ctx.watchEnabled) return;

      // enable dev-mode and attach reload handler that re-runs the command's action
      ctx.dmnoServer.enableWatchMode(async () => {
        console.log('watch mode reload handler!');
        try {
          await rerunCliAction(ctx, thisCommand);
        } catch (err) {
          if (err instanceof CliExitError) {
            // in watch mode, we just log but do not actually exit
            console.error(err.getFormattedOutput());

            // unless error is marked as forcing an actual exit
            if (err.forceExit) process.exit(1);
          } else {
            throw err;
          }
        } finally {
          // print "watching your files..."
          console.log(WATCHING_FILES_MESSAGE);
        }
      });
    })
    .hook('postAction', async (thisCommand, actionCommand) => {
      const ctx = getCliRunCtx();

      // we skip this logic entirely if this is a re-run
      if (ctx.isWatchModeRestart) return;

      // if the command supports watch mode but it is not enabled, we'll exit when the action is complete
      if (!thisCommand.opts().watch) {
        process.exit(0);

      // otherwise we let the user know we are now waiting for changes to restart
      } else {
        console.log(WATCHING_FILES_MESSAGE);
      }
    });
}



