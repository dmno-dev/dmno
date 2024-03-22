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
    description: 'Run a command with the resolved config for a service',
    details: `
      This command runs a command with the resolved config for a service, after all validation and coercion has been applied.
    `,
    examples: [[
      '# For entire workspace',
      'dmno run my-command --with-parameter',
    ], [
      '# For a single service',
      'dmno run -s my-service my-command --with-parameter',
    ]],
  });

  async execute() {
    const configLoader = new ConfigLoaderProcess();

    const config = await configLoader.makeRequest('get-resolved-config', {
      serviceName: this.service,
      packageName: process.env.npm_package_name,
    });

    await executeCommandWithEnv(this.command, config);
  }
}



