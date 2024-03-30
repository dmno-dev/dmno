/* eslint-disable class-methods-use-this */
import kleur from 'kleur';
import _ from 'lodash-es';
import { Command, Option } from 'clipanion';
import CliTable from 'cli-table3';
import { ConfigLoaderProcess } from '../lib/loader-process';
import { formatError, formattedValue } from '../lib/formatting';

export class DevCommand extends Command {
  static paths = [['dev']];

  static usage = Command.Usage({
    description: 'Run dev / watch mode',
    details: `
    Run the service in dev mode, watching for changes and updating as necessary.
    Not specifying a service will run dmno for the whole project.
    `,
    examples: [[
      '# The entire workspace',
      'dmno dev ',
    ], [
      '# For a single service',
      'dmno dev -s my-service',
    ]],
  });

  service = Option.String('-s,--service');
  format = Option.String('-f,--format');


  async execute() {
    console.log('execute dev command');
    const configLoader = new ConfigLoaderProcess();
    await configLoader.isReady.promise;

    await configLoader.makeRequest('start-dev-mode', undefined);

    // const result = await configLoader.makeRequest('get-resolved-config', {
    //   service: this.service,
    //   // maybe we always automatically pass this as context info?
    //   packageName: process.env.npm_package_name,
    // });
  }
}
