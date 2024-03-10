/* eslint-disable class-methods-use-this */

import { Command, Option } from 'clipanion';
import _ from 'lodash-es';


import { ConfigLoaderProcess } from '../lib/loader-process';
import { executeCommandWithEnv } from '../lib/execute-command';




export class RunCommand extends Command {
  static paths = [['run'], ['exec']];
  service = Option.String('-s,--service');
  command = Option.Rest();

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

  async execute() {
    const configLoader = new ConfigLoaderProcess();

    const config = await configLoader.makeRequest('get-resolved-config', {
      service: this.service,
      packageName: process.env.npm_package_name,
    });

    await executeCommandWithEnv(this.command, config);
  }
}



