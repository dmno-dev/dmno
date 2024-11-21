import { Command, Option } from 'commander';
import { getCliRunCtx } from './cli-ctx';
import { CliExitError } from './cli-error';

const VALID_PHASES = ['build', 'boot'];

export function addResolutionPhaseFlags(program: Command) {
  return program
    .addOption(new Option('-p,--phase <phase>', 'resolve in specific phase').choices(VALID_PHASES))
    .hook('preAction', async (thisCommand, actionCommand) => {
      const ctx = getCliRunCtx();
      if (thisCommand.opts().phase) {
        ctx.dmnoServer.setResolutionPhase(thisCommand.opts().phase);
      }
    });
}
