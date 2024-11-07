import { spawnSync } from 'node:child_process';
import Debug from 'debug';
import { ResolutionError } from 'dmno';


const debug = Debug('dmno:1pass-plugin');

export async function execOpCliCommand(cmdArgs: Array<string>) {
  const startAt = new Date();
  // using system-installed copy of `op`
  const cmd = spawnSync('op', cmdArgs);
  debug(`op cli command - "${cmdArgs}"`);
  debug(`> took ${+new Date() - +startAt}ms`);
  if (cmd.status === 0) {
    return cmd.stdout.toString();
  } else if (cmd.error) {
    if ((cmd.error as any).code === 'ENOENT') {
      throw new ResolutionError('1password cli `op` not found', {
        tip: [
          'By not using a service account token, you are relying on your local 1password cli installation for ambient auth.',
          'But your local 1password cli (`op`) was not found. Install it here - https://developer.1password.com/docs/cli/get-started/',
        ],
      });
    } else {
      throw new ResolutionError(`Problem invoking 1password cli: ${cmd.error.message}`);
    }
  } else {
    let errMessage = cmd.stderr.toString();
    // get rid of "[ERROR] 2024/01/23 12:34:56 " before actual message
    // console.log('1pass cli error', errMessage);
    if (errMessage.startsWith('[ERROR]')) errMessage = errMessage.substring(28);
    if (errMessage.includes('authorization prompt dismissed')) {
      throw new ResolutionError('1password app authorization prompt dismissed by user', {
        tip: [
          'By not using a service account token, you are relying on your local 1password installation',
          'When the authorization prompt appears, you must authorize/unlock 1password to allow access',
        ],
      });
    } else if (errMessage.includes("isn't a vault in this account")) {
      throw new ResolutionError('1password vault not found in account connected to op cli', {
        tip: [
          'By not using a service account token, you are relying on your local 1password cli installation and authentication.',
          'The account currently connected to the cli does not contain (or have access to) the selected vault',
          'This must be resolved in your terminal - try running `op whoami` to see which account is connected to your `op` cli.',
          'You may need to call `op signout` and `op signin` to select the correct account.',
        ],
      });
    }
    // when the desktop app integration is not connected, some interactive CLI help is displayed
    // however if it dismissed, we get an error with no message
    // TODO: figure out the right workflow here?
    if (!errMessage) {
      throw new ResolutionError('1password cli not configured', {
        tip: [
          'By not using a service account token, you are relying on your local 1password cli installation and authentication.',
          'You many need to enable the 1password Desktop app integration, see https://developer.1password.com/docs/cli/get-started/#step-2-turn-on-the-1password-desktop-app-integration',
          'Try running `op whoami` to make sure the cli is connected to the correct account',
          'You may need to call `op signout` and `op signin` to select the correct account.',
        ],
      });
    }

    throw new Error(`1password cli error - ${errMessage || 'unknown'}`);
  }
}
