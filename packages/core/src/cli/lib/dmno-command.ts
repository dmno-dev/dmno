import { Command } from 'commander';
import _ from 'lodash-es';

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
