import kleur from 'kleur';
import _ from 'lodash-es';
import { outdent } from 'outdent';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { DmnoCommand } from '../lib/dmno-command';
import { formatError, formattedValue, getItemSummary } from '../lib/formatting';
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
  .option('--ipc-only', 'skip booting the local web server, and communicate over IPC only')
  .example('dmno dev', 'Runs the service in dev mode');

addCacheFlags(program);
addServiceSelection(program, { allowNoSelection: true });
// TODO: need to clarify behaviour around "clear-cache" and if that clears once or on every load


program.action(async (opts: {
  silent?: boolean,
  service?: string,
  ipcOnly?: boolean,
}, more) => {
  const ctx = getCliRunCtx();

  if (!opts.silent) {
    console.log(DMNO_DEV_BANNER);
    await fallingDmnosAnimation();
  }

  await ctx.dmnoServer.webServerReady;
  console.log(boxen(
    [
      `Local DMNO UI running @ ${kleur.bold().magenta(ctx.dmnoServer.webServerUrl || 'ERROR')}`,
    ].join('\n'),
    {
      padding: 1, borderStyle: 'round', borderColor: 'blueBright',
    },
  ));


  let firstLoad = true;
  async function logResult() {
    if (opts.silent) return;

    if (!firstLoad) {
      console.log(gradient('cyan', 'pink')(`\n── Config reloaded ${'─'.repeat(TERMINAL_COLS - 20)}`));
    }
    firstLoad = false;
    console.log('');
    const workspace = await ctx.dmnoServer.getWorkspace();
    if (opts.service) {
      const service = workspace.services[opts.service];

      _.each(service.configNodes, (item) => {
        console.log(getItemSummary(item));
      });
    } else {
      console.log('config loaded!');
    }

    console.log(
      kleur.gray('\n👀 watching your config files for changes... hit CTRL+C to exit'),
    );
  }

  // calling reload will regenerate types and resolve the config
  // TODO: we may want to change how the initial load in dev mode works so we dont need to reload here...
  // await ctx.configLoader.reload();

  await logResult();

  ctx.dmnoServer.enableWatchMode(async () => {
    await logResult();
  });


  // console.log(ctx.configLoader.uuid);
});

export const DevCommand = program;
