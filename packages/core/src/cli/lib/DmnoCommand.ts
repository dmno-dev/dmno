import { Command } from 'commander';

interface Example {
  command: string;
  description: string;
}

// extend command class to add an example method which adds examples to the help output
export class DmnoCommand extends Command {
  examples: Array<Example> = [];

  example(command: string, description: string = '') {
    this.examples.push({ command, description });
    return this;
  }
}
