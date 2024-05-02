import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import { tryCatch } from '@dmno/ts-lib';
import { outdent } from 'outdent';
import boxen from 'boxen';
import { DmnoCommand } from '../lib/DmnoCommand';

import {
  formatError, formattedValue, getItemSummary, joinAndCompact,
} from '../lib/formatting';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';
import { addCacheFlags } from '../lib/cache-helpers';

const TERMINAL_COLS = process.stdout.columns - 10 || 100;

const program = new DmnoCommand('load')
  .summary('Loads and resolves config')
  .description('Loads the resolved config for a service')
  .option('-f, --format <format>', 'format to output resolved config (ex. json)')
  .option('--public', 'only loads public (non-sensitive) values')
  .option('--show-all', 'shows all items, even when config is failing')
  .example('dmno load', 'Loads the resolved config for the root service')
  .example('dmno load --service service1', 'Loads the resolved config for service1')
  .example('dmno load --service service1 --format json', 'Loads the resolved config for service1 in JSON format');

addServiceSelection(program);
addCacheFlags(program);

program.action(async (opts: {
  service?: string,
  format?: string,
  public?: boolean,
  showAll?: boolean,
  skipCache?: boolean,
  clearCache?: boolean,
}, thisCommand) => {
  const ctx = getCliRunCtx();

  const workspace = await tryCatch(async () => {
    return await ctx.configLoader.getWorkspace();
  }, (err) => {
    console.log(kleur.red().bold('Loading config failed'));
    console.log(err.message);
    process.exit(1);
  });
  await workspace.resolveConfig();

  // first display loading errors (which would likely cascade into schema errors)
  if (_.some(_.values(workspace.allServices), (s) => s.configLoadError)) {
    console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline('We were unable to load all of your config')}  🚨 🚨 🚨\n`);
    console.log(kleur.gray('The following services are failing to load:\n'));

    // NOTE - we dont use a table here because word wrapping within the table
    // breaks clicking/linking into your code

    _.each(workspace.allServices, (service) => {
      if (!service.configLoadError) return;
      console.log(kleur.bold().red(`💥 Service ${kleur.underline(service.serviceName)} failed to load 💥\n`));

      console.log(kleur.bold(service.configLoadError.message), '\n');

      console.log(service.configLoadError.cleanedStack?.join('\n'), '\n');
    });
    process.exit(1);
  }

  // console.dir(workspace.services.root.config, { depth: null });
  // console.dir(workspace.plugins, { depth: null });

  // now show plugin errors - which would also likely cause further errors
  if (_.some(_.values(workspace.plugins), (p) => !p.isValid)) {
    console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline('Your plugins were unable to initialize correctly')}  🚨 🚨 🚨\n`);

    const errorsTable = new CliTable({
      // TODO: make helper to get column widths based on percentages
      colWidths: [
        Math.floor(TERMINAL_COLS * 0.25),
        Math.floor(TERMINAL_COLS * 0.25),
        Math.floor(TERMINAL_COLS * 0.5),
      ],
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


    _.each(workspace.plugins, (plugin) => {
      _.each(plugin.inputItems, (item) => {
        if (item.isValid) return;

        const pathCellContents = [
          kleur.blue(plugin.initByService?.serviceName || ''),
          `${kleur.gray('└')}${plugin.instanceName}`,
          ` ${kleur.gray('└')}${item.key}`,
        ].join('\n');

        const valueCellContents = formattedValue(item.resolvedValue, false);
        // if (item.resolvedRawValue !== item.resolvedValue) {
        //   valueCellContents += kleur.gray().italic('\n------\ncoerced from\n');
        //   valueCellContents += formattedValue(item.resolvedRawValue, false);
        // }

        const errors = _.compact([
          item.coercionError,
          ...item.validationErrors || [],
          item.schemaError,
        ]);

        errorsTable.push([
          pathCellContents,
          valueCellContents,
          // errors?.map((err) => formatError(err)).join('\n'),
          errors?.map((err) => err.message).join('\n'),
        ]);
      });
    });



    console.log(errorsTable.toString());
    process.exit(1);
  }

  // now show schema errors
  if (_.some(_.values(workspace.allServices), (s) => s.schemaErrors?.length)) {
    console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline('Your config schema is invalid')}  🚨 🚨 🚨\n`);
    console.log(kleur.gray('The following services have issues:\n'));

    const errorsTable = new CliTable({
      colWidths: [
        Math.floor(TERMINAL_COLS * 0.25),
        Math.floor(TERMINAL_COLS * 0.75),
      ],
      wordWrap: true,
    });

    // header row
    errorsTable.push(
      [
        'Service',
        'Error(s)',
      ].map((t) => kleur.bold().magenta(t)),
    );

    _.each(workspace.allServices, (service) => {
      if (!service.schemaErrors?.length) return;

      errorsTable.push([
        service.serviceName,
        _.map(service.schemaErrors, formatError).join('\n'),
      ]);
    });
    console.log(errorsTable.toString());
    process.exit(1);
  }


  if (!opts.service) {
    console.log('select a service to load');
    process.exit(1);
  }

  const service = workspace.getService(opts.service);
  const failingItems = _.filter(service.config, (item) => !item.isValid);

  // TODO: make isValid flag on service to work
  if (failingItems.length > 0) {
    console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline(`Configuration of service "${kleur.magenta(service.serviceName)}" is currently invalid `)}  🚨 🚨 🚨\n`);
    console.log('Invalid items:\n');

    _.each(failingItems, (item) => {
      console.log(getItemSummary(item.toJSON()));
      console.log();
    });
    if (opts.showAll) {
      console.log();
      console.log(joinAndCompact([
        'Valid items:',
        kleur.italic().gray('(remove `--show-all` flag to hide)'),
      ]));
      console.log();
      const validItems = _.filter(service.config, (i) => !!i.isValid);
      _.each(validItems, (item) => {
        console.log(getItemSummary(item.toJSON()));
      });
    }


    // const errorsTable = new CliTable({
    //   // TODO: make helper to get column widths based on percentages
    //   colWidths: [
    //     Math.floor(TERMINAL_COLS * 0.25),
    //     Math.floor(TERMINAL_COLS * 0.25),
    //     Math.floor(TERMINAL_COLS * 0.5),
    //   ],
    //   wordWrap: true,
    // });

    // // header row
    // errorsTable.push(
    //   [
    //     'Path',
    //     'Value',
    //     'Error(s)',
    //   ].map((t) => kleur.bold().magenta(t)),
    // );


    // _.each(failingItems, (item) => {
    //   let valueCellContents = formattedValue(item.resolvedValue, false);
    //   if (item.resolvedRawValue !== item.resolvedValue) {
    //     valueCellContents += kleur.gray().italic('\n------\ncoerced from\n');
    //     valueCellContents += formattedValue(item.resolvedRawValue, false);
    //   }

    //   const errors = _.compact([
    //     item.coercionError,
    //     ...item.validationErrors || [],
    //     item.resolutionError,
    //   ]);

    //   errorsTable.push([
    //     item.key,
    //     valueCellContents,
    //     // errors?.map((err) => formatError(err)).join('\n'),
    //     errors?.map((err) => err.message).join('\n'),
    //   ]);
    // });


    // console.log(errorsTable.toString());

    process.exit(1);
  }


  let exposedConfig = service.config;
  if (opts.public) {
    exposedConfig = _.pickBy(exposedConfig, (c) => !c.type.getDefItem('sensitive'));
  }
  const valuesOnly = _.mapValues(exposedConfig, (val) => {
    return val.resolvedValue;
  });


  // console.log(service.config);
  if (opts.format === 'json') {
    console.log(JSON.stringify(valuesOnly));
  } else if (opts.format === 'json-full') {
    // TODO: this includes sensitive info when using --public option
    console.dir(service.toJSON(), { depth: null });
  } else {
    console.log('\nConfig loaded successfully:\n');
    _.each(service.config, (item) => {
      console.log(getItemSummary(item.toJSON()));
    });
    console.log('');
  }
  process.exit(0);
});

export const LoadCommand = program;
