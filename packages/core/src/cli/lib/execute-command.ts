import { ExecaChildProcess, execa } from 'execa';
import which from 'which';

// TODO: swap this out...
const logger = {
  debug(log: string) {
    // console.log(log);
  },
  error(log: string) {
    // console.error(log);
  },
};

// TODO: move this somewhere to reuse it
const REPORT_ISSUE_LINK = 'https://github.com/dmno-dev/core/issues';


// list of other non SIGINT signals we care about
const OTHER_SIGNALS = [
  'SIGHUP', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
  'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM',
];

export async function executeCommandWithEnv(commandArgs: Array<string>, env: Record<string, any>) {
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

  function otherSignalHandler(signal: string) {
    logger.debug(`received ${signal} signal`);
  }

  try {
    // attempt to expand shortened command to full path using PATH
    const pathAwareCommand = await which(`${commandArgs[0]}`, { nothrow: true });
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

    OTHER_SIGNALS.forEach((signal) => {
      process.on(signal, () => otherSignalHandler(signal));
    });

    // Wait for the command process to finish
    const { exitCode } = await commandProcess;

    if (exitCode !== 0) {
      logger.debug(`received non-zero exitCode: ${exitCode}`);
      throw new Error(`Command failed with exit code ${exitCode}`);
    }
  } catch (error) {
    if ((error as any).signal !== 'SIGINT') {
      logger.error((error as Error).message);
      logger.error(`command [${fullCommand}] failed`);
      logger.error('try running the same command without dmno');
      logger.error('if you get a different result, dmno may be the problem...');
      logger.error(`Please report issue here: <${REPORT_ISSUE_LINK}>`);
    }
    process.exit((error as any).exitCode || 1);
  } finally {
    process.removeListener('SIGINT', sigintHandler);
  }
}
