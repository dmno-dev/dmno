/* eslint-disable class-methods-use-this */

import { Command, Option } from 'clipanion';
import pc from 'picocolors';
import { input } from '@inquirer/prompts';
import { createDmnoDataType } from '../../base-types';
import { ConfigLoaderProcess, loadDmnoConfig } from '../lib/loader-process';
import { promiseDelay } from '../../lib/delay';




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


  async execute() {
    const configLoader = new ConfigLoaderProcess();

    await promiseDelay(1000);

    if (!this.service) {
      throw new Error('please set a service name');
    }

    const config = await configLoader.makeRequest('get-resolved-config', { service: this.service });

    console.log('-----------------------------------------');
    console.log(`Resolved env for service ${this.service}`);
    console.log('-----------------------------------------');

    console.log(config);
  }
}
