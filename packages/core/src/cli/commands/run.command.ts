/* eslint-disable class-methods-use-this */

import { Command, Option } from 'clipanion';
import pc from 'picocolors';
import { input } from '@inquirer/prompts';
import _ from 'lodash-es';


import { ConfigLoaderProcess, loadDmnoConfig } from '../lib/loader-process';
import { executeCommandWithEnv } from '../lib/execute-command';
import { promiseDelay } from '../../lib/delay';





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
    // console.log('console.log!');
    // this.context.stdout.write('Hello stdout!\n');
    // console.log(this.command);

    const configLoader = new ConfigLoaderProcess();

    // TODO: have `makeRequest` wait for the ipc stuff to be set up
    // rather than needing a delay...
    await promiseDelay(1000);


    // TODO: infer the service from the current directory, if not set
    if (!this.service) {
      throw new Error('please set a service name');
    }

    const config = await configLoader.makeRequest('get-resolved-config', { service: this.service });

    // console.log('resolved config', config);

    await executeCommandWithEnv(this.command, config);
  }
}



