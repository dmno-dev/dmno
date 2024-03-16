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
  });

  service = Option.String('-s,--service');
  format = Option.String('-f,--format');


  async execute() {
    console.log('execute dev command');
    const configLoader = new ConfigLoaderProcess();
    await configLoader.isReady.promise;

    console.log('ready');

    setInterval(() => {
      console.log('tick from cli');
    }, 1000);

    // const result = await configLoader.makeRequest('get-resolved-config', {

    // const result = await configLoader.makeRequest('get-resolved-config', {
    //   service: this.service,
    //   // maybe we always automatically pass this as context info?
    //   packageName: process.env.npm_package_name,
    // });
  }
}
