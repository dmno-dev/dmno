import kleur from 'kleur';
import _ from 'lodash-es';
import { outdent } from 'outdent';
import gradient from 'gradient-string';
import { DmnoCommand } from '../lib/dmno-command';
import { formatError, formattedValue, getItemSummary } from '../lib/formatting';
import { executeCommandWithEnv } from '../lib/execute-command';
import { getCliRunCtx } from '../lib/cli-ctx';
import { ConfigServer } from '../../config-loader/config-server';
import { addCacheFlags } from '../lib/cache-helpers';
import { addServiceSelection } from '../lib/selection-helpers';
import { DMNO_DEV_BANNER, fallingDmnoLoader, fallingDmnosAnimation } from '../lib/loaders';

const TERMINAL_COLS = Math.floor(process.stdout.columns * 0.75);

const program = new DmnoCommand('dev')
  .summary('dev / watch mode')
  .description(`
Runs the service in dev mode, and watches for changes and updates as needed.
  `)
  .option('--silent', 'do not log anything, useful when using in conjunction with a ConfigServerClient which will do its own logging')
  .example('dmno dev', 'Runs the service in dev mode');

addServiceSelection(program, { allowNoSelection: true });
// TODO: need to clarify behaviour around "clear-cache" and if that clears once or on every load
addCacheFlags(program);

program.action(async (opts: {
  silent?: boolean,
  service?: string,
}, more) => {
  const ctx = getCliRunCtx();

  const configServer = new ConfigServer(ctx.configLoader);
  ctx.configLoader.devMode = true;

  if (!opts.silent) {
    console.log(DMNO_DEV_BANNER);
    await fallingDmnosAnimation();
  }

  let firstLoad = true;
  async function logResult() {
    if (opts.silent) return;

    if (!firstLoad) {
      console.log(gradient('cyan', 'pink')(`\n── Config reloaded ${'─'.repeat(TERMINAL_COLS - 20)}`));
    }
    firstLoad = false;
    console.log('');
    const workspace = await ctx.configLoader.getWorkspace();
    if (opts.service) {
      const service = workspace.getService(opts.service);

      _.each(service.config, (item) => {
        console.log(getItemSummary(item.toJSON()));
      });
    } else {
      console.log('config loaded!');
    }

    console.log(
      kleur.gray('\n👀 watching your config files for changes... hit CTRL+C to exit'),
    );
  }

  // calling reload will regenerate types and resolve the config
  // TODO: we may want to chagne how the initial load in dev mode works so we dont need to reload here...
  await ctx.configLoader.reload();

  await logResult();

  configServer.onReload = () => logResult();



  // console.log(ctx.configLoader.uuid);
});

export const DevCommand = program;
