import _ from 'lodash-es';
import { ExecaChildProcess, execa } from 'execa';
import which from 'which';
import Debug from 'debug';

import kleur from 'kleur';
import { DmnoCommand } from '../lib/dmno-command';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';
import { addCacheFlags } from '../lib/cache-helpers';
import { addWatchMode } from '../lib/watch-mode-helpers';
import { checkForConfigErrors, checkForSchemaErrors } from '../../config-engine/check-errors-helpers';

const program = new DmnoCommand('run')
  .summary('Injects loaded config into an external command')
  .description('Runs a command with the resolved config for a service')
  .usage('[options] -- [command to pass config to]')
  .argument('external command')
  .example('dmno run --service service1 -- printenv $SOME_ITEM', 'Runs the echo command with the resolved config for service1')
  .example('dmno run —-service service1 -- somecommand --some-option=(printenv SOME_VAR)', 'Runs the somecommand with the resolved config using SOME_VAR via printenv');

addWatchMode(program);
addCacheFlags(program);
addServiceSelection(program);


let commandProcess: ExecaChildProcess | undefined;
let childCommandKilledFromRestart = false;

program.action(async (_command, opts: {
  service: string,
}, more) => {
  const commandToRunAsArgs = more.args;
  const commandToRunStr = more.args.join(' ');
  const rawCommand = more.args[0];
  const commandArgsOnly = more.args.slice(1);

  const pathAwareCommand = which.sync(rawCommand, { nothrow: true });
  // if (pathAwareCommand) {
  //   logger.debug(`expanded [${rawCommand}] to [${pathAwareCommand}]`);
  // } else {
  //   logger.debug(`could not expand command [${rawCommand}]`);
  // }

  const ctx = getCliRunCtx();

  // if subcommand is still running, we'll kill it
  // this could be a re-run via watch mode
  if (commandProcess && commandProcess.exitCode === null) {
    childCommandKilledFromRestart = true;
    commandProcess.kill(2);
  }

  if (!ctx.selectedService) return;

  // TODO: not quite right
  const workspace = ctx.workspace!;
  const service = ctx.selectedService;
  checkForSchemaErrors(workspace);
  //! await workspace.resolveConfig();
  checkForConfigErrors(service);

  const injectedJson = await ctx.dmnoServer.makeRequest('getInjectedJson', ctx.selectedService.serviceName);

  const fullInjectedEnv = {
    ...process.env,
  };
  // we need to add any config items that are defined in dmno config, but we dont want to modify existing items
  for (const key in injectedJson) {
    // must skip $SETTINGS
    if (key.startsWith('$')) continue;

    // TODO: need to think about how we deal with nested items
    // TODO: let config nodes expose themselves in inject env vars with aliases
    if (!Object.hasOwn(process.env, key)) {
      const strVal = injectedJson[key]?.value?.toString();
      if (strVal !== undefined) fullInjectedEnv[key] = strVal;
    }
  }

  fullInjectedEnv.DMNO_INJECTED_ENV = JSON.stringify(injectedJson);
  // this is what signals to the child process that is has a parent dmno server to use
  fullInjectedEnv.DMNO_CONFIG_SERVER_UUID = ctx.dmnoServer.serverId;


  commandProcess = execa(pathAwareCommand || rawCommand, commandArgsOnly, {
    stdio: 'inherit',
    env: fullInjectedEnv,
  });
  // console.log('PARENT PID = ', process.pid);
  // console.log('CHILD PID = ', commandProcess.pid);

  // if first run, we need to attach some extra exit handling
  if (!ctx.isWatchModeRestart) {
    // try to make sure we shut down cleanly and kill the child process
    process.on('exit', (code: any, signal: any) => {
      // if (childCommandKilledFromRestart) {
      //   childCommandKilledFromRestart = false;
      //   return;
      // }
      // console.log('exit!', code, signal);
      commandProcess?.kill(9);
    });

    ['SIGTERM', 'SIGINT'].forEach((signal) => {
      process.on(signal, () => {
        // console.log('SIGNAL = ', signal);
        commandProcess?.kill(9);
        process.exit(1);
      });
    });
    // TODO: handle other signals?
  }


  let exitCode: number;
  try {
    const commandResult = await commandProcess;
    exitCode = commandResult.exitCode;
  } catch (error) {
    // console.log('child command error!', error);
    if ((error as any).signal === 'SIGINT' && childCommandKilledFromRestart) {
      // console.log('child command failed due to being killed form restart');
      childCommandKilledFromRestart = false;
      return;
    }

    // console.log('child command result error', error);
    if ((error as any).signal === 'SIGINT' || (error as any).signal === 'SIGKILL') {
      process.exit(1);
    } else {
      console.log((error as Error).message);
      console.log(`command [${commandToRunStr}] failed`);
      console.log('try running the same command without dmno');
      console.log('if you get a different result, dmno may be the problem...');
      // console.log(`Please report issue here: <${REPORT_ISSUE_LINK}>`);
    }
    exitCode = (error as any).exitCode || 1;
  }

  if (ctx.watchEnabled) {
    if (!childCommandKilledFromRestart) {
      if (exitCode === 0) {
        console.log('\n✅ command completed successfully');
      } else {
        console.log(`\n💥 command failed - exit code = ${exitCode}`);
      }
    }
  }

  if (!ctx.watchEnabled) {
    process.exit(exitCode);
  }
});

export const RunCommand = program;
