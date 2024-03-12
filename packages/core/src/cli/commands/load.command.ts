/* eslint-disable class-methods-use-this */

import { Command, Option } from 'clipanion';
import { ConfigLoaderProcess } from '../lib/loader-process';

export class LoadCommand extends Command {
  static paths = [['load']];

  static usage = Command.Usage({
    // category: 'My category',
    description: 'A small description of the command.',
    details: `
      A longer description of the command with some \`markdown code\`.
      
      Multiple paragraphs are allowed. Clipanion will take care of both reindenting the content and wrapping the paragraphs as needed.
    `,
    examples: [[
      'A basic example',
      '$0 my-command',
    ], [
      'A second example',
      '$0 my-command --with-parameter',
    ]],
  });

  service = Option.String('-s,--service');
  format = Option.String('-f,--format');


  async execute() {
    const configLoader = new ConfigLoaderProcess();

    const config = await configLoader.makeRequest('get-resolved-config', {
      service: this.service,
      // maybe we always automatically pass this as context info?
      packageName: process.env.npm_package_name,
    });

    if (this.format === 'json') {
      console.log(JSON.stringify(config));
    } else {
      console.log('-----------------------------------------');
      console.log(`Resolved env for service ${this.service}`);
      console.log('-----------------------------------------');
      console.log(config);
    }
  }
}
