/* eslint-disable class-methods-use-this */

import { Command, Option } from 'clipanion';
import { ConfigLoaderProcess } from '../lib/loader-process';

export class TypeGenCommand extends Command {
  static paths = [['types']];

  static usage = Command.Usage({
    // category: 'My category',
    description: 'Generate TS types for the config',
    details: `
    `,
  });

  service = Option.String('-s,--service');
  format = Option.String('-f,--format');


  async execute() {
    const configLoader = new ConfigLoaderProcess();


    const result = await configLoader.makeRequest('generate-types', {
      serviceName: this.service,
      // maybe we always automatically pass this as context info?
      packageName: process.env.npm_package_name,
    });

    console.log('-----------------------------------------');
    console.log(`Generated TS src for service ${this.service}`);
    console.log('-----------------------------------------');
    console.log(result.tsSrc);
  }
}
