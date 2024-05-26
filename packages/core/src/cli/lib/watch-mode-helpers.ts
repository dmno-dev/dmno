import { Command } from 'commander';
import kleur from 'kleur';
import { CliRunCtx, getCliRunCtx } from './cli-ctx';


const WATCH_MODE_LOG = [
  '',
  kleur.gray('👀 watching your config files for changes... (CTRL+C to exit)'),
].join('\n');

let isRerunInProgress = false;
let enqueueRerun = false;


async function rerunCliAction(ctx: CliRunCtx, thisCommand: Command) {
  console.log(kleur.blue().italic('reloading due to config change'));

  ctx.workspace = await ctx.configLoader.getWorkspace();

  // going to try to re-execute the command's action handler
  // probably a bad idea... but let's try it?
  // as long as we follow similar patterns for any watch-enabled commands, we may be fine

  // we track that this is a re-run, so actions and hooks can alter their behaviour if necessary
  ctx.isWatchModeRestart = true;

  // normally hooks/actions would call process.exit, but instead they call ctx.exit which in watch mode will just
  // let us stop the re-run
  ctx.isExited = false; // we reset it on each re-run here!

  // we'll re-run our lifecycle hooks, which means they must be aware of how to handle being run multiple times
  // usually this means just skipping unless something specific is going on

  // rerun pre-hooks
  for (const preHook of (thisCommand as any)._lifeCycleHooks.preAction) {
    // if the hook exited we stop the rest
    if (!ctx.isExited) await preHook(thisCommand);
  }
  if (!ctx.isExited) {
    // re-run the action handler
    await (thisCommand as any)._actionHandler(thisCommand.processedArgs);
  }

  // rerun post-hooks
  for (const postHook of (thisCommand as any)._lifeCycleHooks.postAction) {
    if (!ctx.isExited) await postHook(thisCommand.processedArgs);
  }

  console.log(WATCH_MODE_LOG);


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
      ctx.configLoader.devMode = true;
      ctx.configLoader.onReload = async () => {
        return rerunCliAction(ctx, thisCommand);
      };
    })
    .hook('postAction', async (thisCommand, actionCommand) => {
      const ctx = getCliRunCtx();
      if (ctx.isWatchModeRestart) return;

      if (!thisCommand.opts().watch) {
        process.exit(0);
      } else {
        console.log(WATCH_MODE_LOG);
      }
    });
}



