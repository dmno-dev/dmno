import { ExecaChildProcess, execa } from 'execa';
import which from 'which';

// TODO: swap this out...
const logger = {
  debug(log: string) {
    console.log(log);
  },
  error(log: string) {
    // console.error(log);
  },
};

// TODO: move this somewhere to reuse it
const REPORT_ISSUE_LINK = 'https://github.com/dmno-dev/dmno/issues';


// list of other non SIGINT signals we care about
const OTHER_SIGNALS = [
  'SIGHUP', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
  'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM',
];

export function executeCommandWithEnv(
  commandArgs: Array<string>,
  env: Record<string, any>,
) {
  const fullCommand = commandArgs.join(' ');
  const rawCommand = commandArgs[0];
  const commandArgsOnly = commandArgs.slice(1);

  logger.debug(`executing command - [${fullCommand}]`);

  let commandProcess: ExecaChildProcess;

  function sigintHandler() {
    logger.debug('received SIGINT signal');
    // logger.debug(commandProcess);

    if (commandProcess) {
      logger.debug('sending SIGINT to command process');
      commandProcess.kill('SIGINT');
    } else {
      logger.debug('no command process ');
    }
  }

  // function otherSignalHandler(signal: string) {
  //   logger.debug(`received ${signal} signal`);
  // }

  try {
    // attempt to expand shortened command to full path using PATH
    const pathAwareCommand = which.sync(`${commandArgs[0]}`, { nothrow: true });
    if (pathAwareCommand) {
      logger.debug(`expanded [${rawCommand}] to [${pathAwareCommand}]`);
    } else {
      logger.debug(`could not expand command [${rawCommand}]`);
    }

    // try to use expanded command, but fallback to original
    commandProcess = execa(pathAwareCommand || rawCommand, commandArgsOnly, {
      stdio: 'inherit',
      env: {
        // not totally sure if we always want to pass this through?
        // maybe optionally turn it off?
        ...process.env,
        ...env,
      },
    });

    process.on('SIGINT', sigintHandler);

    // OTHER_SIGNALS.forEach((signal) => {
    //   process.on(signal, () => otherSignalHandler(signal));
    // });

    return {
      process: commandProcess,
      kill: (signal?: number) => {
        process.removeListener('SIGINT', sigintHandler);
        if (commandProcess.exitCode === null) {
          commandProcess.kill(signal ?? 2);
          return true;
        } else {
          return false;
        }
      },
    };
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}
