import kleur from 'kleur';
import _ from 'lodash-es';
import { ExecaChildProcess, execa } from 'execa';
import which from 'which';

import CliTable from 'cli-table3';
import { tryCatch } from '@dmno/ts-lib';
import { DmnoCommand } from '../lib/DmnoCommand';
import { formatError, formattedValue } from '../lib/formatting';
import { executeCommandWithEnv } from '../lib/execute-command';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';

const program = new DmnoCommand('run')
  .summary('Injects loaded config into an external command')
  .description('Runs a command with the resolved config for a service')
  .usage('[options] -- [command to pass config to]')
  .option('-w,--watch', 'watch config for changes and restart command')
  .argument('external command')
  .example('dmno run --service service1 -- echo $SERVICE1_CONFIG', 'Runs the echo command with the resolved config for service1');

addServiceSelection(program);


program.action(async (_command, opts: {
  watch: boolean,
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

  let commandProcess: ExecaChildProcess | undefined;

  let childCommandKilled = false;

  async function rerunChildProcess() {
    // if subcommand is still running, we'll kill it
    if (commandProcess && commandProcess.exitCode === null) {
      childCommandKilled = true;
      commandProcess.kill(2);
      console.log(kleur.blue().italic('reloading due to config change'));
    }

    // reload the workspace, service, config
    const workspace = await tryCatch(async () => {
      return await ctx.configLoader.getWorkspace();
    }, (err) => {
      // TODO: in watch mode, we may want to wait and reload on update?
      console.log(kleur.red().bold('Loading config failed'));
      console.log(err.message);
      process.exit(1);
    });
    await workspace.resolveConfig();
    const service = workspace.getService(opts.service);
    const serviceEnv = service.getEnv();


    // TODO: should show nice errors, and that logic should probably move within the services/items
    // TODO: service.isValid is not correct
    let allValid = true;
    for (const itemKey in service.config) {
      const item = service.config[itemKey];
      if (!item.isValid) {
        allValid = false;
        console.log(`Invalid config for item: ${itemKey}`);
        console.log(item.validationErrors);
      }
    }

    if (allValid) {
      console.log(service.getLoadedEnv());

      commandProcess = execa(pathAwareCommand || rawCommand, commandArgsOnly, {
        stdio: 'inherit',
        env: {
          ...process.env,
          ...serviceEnv,
          DMNO_LOADED_ENV: JSON.stringify(service.getLoadedEnv()),
          DMNO_SENSITIVE_PATHS: service.getSensitivePaths().join('!'),
          DMNO_EMPTY_PATHS: service.getEmptyPaths().join('!'),
        },
      });
      // console.log('PARENT PID = ', process.pid);
      // console.log('CHILD PID = ', commandProcess.pid);

      let exitCode: number;
      try {
        const commandResult = await commandProcess;
        // console.log(commandResult);
        exitCode = commandResult.exitCode;
      } catch (error) {
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

      if (opts.watch) {
        if (!childCommandKilled) {
          if (exitCode === 0) {
            console.log('\n✅ command completed successfully');
          } else {
            console.log(`\n💥 command failed - exit code = ${exitCode}`);
          }

          console.log(kleur.blue().italic('... watching for changes to dmno config ...'));
        }
      } else {
        process.exit(exitCode);
      }
    } else {
      if (!opts.watch) process.exit(1);
      else {
        console.log(kleur.blue().italic('... watching for changes to dmno config ...'));
      }
    }
  }

  if (opts.watch) {
    ctx.configLoader.devMode = true;
    ctx.configLoader.onReload = rerunChildProcess;
  }
  await rerunChildProcess();

  // try to make sure we shut down cleanly and kill the child process
  process.on('exit', (code: any, signal: any) => {
    console.log('exit!', code, signal);
    commandProcess?.kill(9);
  });

  let isTerminating = false;
  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on(signal, () => {
      console.log('SIGNAL = ', signal);
      isTerminating = true;
      commandProcess?.kill(9);
      process.exit(1);
    });
  });

  // TODO: handle other signals?
});

export const RunCommand = program;
