import { Command } from 'commander';
import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import { formatError, formattedValue } from '../lib/formatting';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';

const TERMINAL_COLS = process.stdout.columns - 10 || 100;

const program = new Command('load')
  .summary('load and resolve config')
  .description('Load the resolved config for a service')
  .option('-f, --format <format>', 'format to output resolved config')
  .option('--public', 'only load public (non-secret) values');

addServiceSelection(program);


program.action(async (opts: {
  service?: string,
  format?: string,
  public?: boolean,
}, thisCommand) => {
  const ctx = getCliRunCtx();

  const workspace = await ctx.configLoader.makeRequest('load-full-schema', { resolve: true });

  // first display loading errors (which would likely cascade into schema errors)
  if (_.some(_.values(workspace.services), (s) => s.configLoadError)) {
    console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline('We were unable to load all of your config')}  🚨 🚨 🚨\n`);
    console.log(kleur.gray('The following services are failing to load:\n'));

    // NOTE - we dont use a table here because word wrapping within the table
    // breaks clicking/linking into your code

    _.each(workspace.services, (service) => {
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
      _.each(plugin.inputs, (item) => {
        if (item.isValid) return;

        const pathCellContents = [
          plugin.initializedInService,
          ` ${plugin.instanceName}`,
          `  ${item.key}`,
        ].join('\n');


        let valueCellContents = formattedValue(item.resolvedValue, false);
        if (item.resolvedRawValue !== item.resolvedValue) {
          valueCellContents += kleur.gray().italic('\n------\ncoerced from\n');
          valueCellContents += formattedValue(item.resolvedRawValue, false);
        }

        const errors = _.compact([
          item.coercionError,
          ...item.validationErrors || [],
          item.schemaError,
        ]);

        errorsTable.push([
          pathCellContents,
          valueCellContents,
          errors?.map((err) => formatError(err)).join('\n'),
        ]);
      });
    });



    console.log(errorsTable.toString());
    process.exit(1);
  }

  // now show schema errors
  if (_.some(_.values(workspace.services), (s) => s.schemaErrors?.length)) {
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

    _.each(workspace.services, (service) => {
      if (!service.schemaErrors?.length) return;

      errorsTable.push([
        service.serviceName,
        _.map(service.schemaErrors, formatError).join('\n'),
      ]);
    });
    console.log(errorsTable.toString());
    process.exit(1);
  }




  const configResult = await ctx.configLoader.makeRequest('get-resolved-config', {
    serviceName: opts.service,
  });


  const failingItems = _.filter(configResult.config, (item) => !item.isValid);

  // TODO: make isValid flag on service to work
  if (failingItems.length > 0) {
    console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline('Your configuration is currently failing validation')}  🚨 🚨 🚨\n`);
    console.log(kleur.gray('The following config item(s) are failing:\n'));

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


    _.each(failingItems, (item) => {
      let valueCellContents = formattedValue(item.resolvedValue, false);
      if (item.resolvedRawValue !== item.resolvedValue) {
        valueCellContents += kleur.gray().italic('\n------\ncoerced from\n');
        valueCellContents += formattedValue(item.resolvedRawValue, false);
      }

      const errors = _.compact([
        item.coercionError,
        ...item.validationErrors || [],
        item.resolutionError,
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


  let exposedConfig = configResult.config;
  if (opts.public) {
    exposedConfig = _.pickBy(exposedConfig, (c) => !c.dataType.sensitive);
  }
  const valuesOnly = _.mapValues(exposedConfig, (val) => {
    return val.resolvedValue;
  });


  if (opts.format === 'json') {
    console.log(JSON.stringify(valuesOnly));
  } else {
    console.dir(exposedConfig, { depth: null });
  }
  process.exit(0);
});

export const LoadCommand = program;
