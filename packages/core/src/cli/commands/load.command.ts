/* eslint-disable class-methods-use-this */
import kleur from 'kleur';
import _ from 'lodash-es';
import { Command, Option } from 'clipanion';
import CliTable from 'cli-table3';
import { ConfigLoaderProcess } from '../lib/loader-process';
import { formatError, formattedValue } from '../lib/formatting';

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
    console.log('execute load command');
    const configLoader = new ConfigLoaderProcess();

    const result = await configLoader.makeRequest('get-resolved-config', {
      service: this.service,
      // maybe we always automatically pass this as context info?
      packageName: process.env.npm_package_name,
    });

    // TODO: remove this all into a helper, since we'll need similar handling on a bunch of commands...

    const failingItems = _.filter(result.config, (item) => !item.isValid);

    // TODO: make isValid flag on service to work
    if (failingItems.length > 0) {
      console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline('Your configuration is currently failing validation')}  🚨 🚨 🚨\n`);
      console.log(kleur.gray('The following config item(s) are failing:\n'));

      let terminalCols = process.stdout.columns - 10 || 100;

      const errorsTable = new CliTable({
        // TODO: make helper to get column widths based on percentages
        colWidths: [Math.floor(terminalCols * 0.25), Math.floor(terminalCols * 0.25), Math.floor(terminalCols * 0.5)],
        wordWrap: true,
      });

      // header row
      errorsTable.push(
        [
          'Path',
          'Value',
          'Error(s)',
        ].map((t) => kleur.bold().magenta(t)),
      );


      _.each(failingItems, (item) => {
        let valueCellContents = formattedValue(item.resolvedValue, false);
        if (item.resolvedRawValue !== item.resolvedValue) {
          valueCellContents += kleur.gray().italic('\n------\ncoerced from\n');
          valueCellContents += formattedValue(item.resolvedRawValue, false);
        }

        let errors = _.compact([
          item.coercionError,
          ...item.validationErrors || [],
        ]);

        errorsTable.push([
          item.key,
          valueCellContents,
          errors?.map((err) => formatError(err)).join('\n'),
        ]);
      });

      console.log(errorsTable.toString());

      process.exit(1);
    }


    if (this.format === 'json') {
      console.log(JSON.stringify(result.config));
    } else {
      console.log('-----------------------------------------');
      console.log(`Resolved env for service ${this.service}`);
      console.log('-----------------------------------------');
      console.table(result.config);
    }
  }
}
