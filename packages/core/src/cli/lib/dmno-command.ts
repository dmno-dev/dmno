import { Command } from 'commander';
import _ from 'lodash-es';
import kleur from 'kleur';
import { select } from '@inquirer/prompts';
import { exitWithErrorMessage } from './error-helpers';
import { CliRunCtx, getCliRunCtx } from './cli-ctx';
import { getMaxLength } from './string-utils';
import { DmnoService } from '../../config-engine/config-engine';

interface CliCommandExample {
  command: string;
  description: string;
}


// extend command class to add an example method which adds examples to the help output
/**
 * Extend built in commander.js Command class to add more functionality
 * - structured usage examples which can feed into docs and help
 * - wrapped action handler, which injects common functionality
 */
export class DmnoCommand extends Command {
  /** array of usage examples */
  examples: Array<CliCommandExample> = [];

  /** attach a usage example - feeds into auto-generated docs */
  example(command: string, description: string = '') {
    this.examples.push({ command, description });
    return this;
  }
}
