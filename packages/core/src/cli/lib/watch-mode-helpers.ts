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
  // try to re-select the same service, which could be a bit weird if the name(s) have changed
  // but we try to just select the same one and not worry too much
  if (ctx.selectedService) {
    ctx.selectedService = ctx.workspace.getService({ serviceName: ctx.selectedService.serviceName })
      || ctx.workspace.getService({ packageName: ctx.selectedService.packageName });
  }


  // going to try to re-execute the command's action handler
  // probably a bad idea... but let's try it?
  // as long as we follow similar patterns for any watch-enabled commands, we may be fine
  ctx.isWatchModeRestart = true;
  await (thisCommand as any)._actionHandler(thisCommand.processedArgs);
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
      ctx.watchEnabled = thisCommand.opts().watch;
      if (!ctx.watchEnabled) return;

      console.log(thisCommand);

      // enable dev-mode and attach reload handler that re-runs the command's action
      ctx.configLoader.devMode = true;
      ctx.configLoader.onReload = async () => {
        return rerunCliAction(ctx, thisCommand);
      };
    })
    .hook('postAction', async (thisCommand, actionCommand) => {
      if (!thisCommand.opts().watch) {
        process.exit(0);
      } else {
        console.log(WATCH_MODE_LOG);
      }
    });
}



