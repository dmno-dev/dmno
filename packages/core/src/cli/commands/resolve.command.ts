import kleur from 'kleur';
import _ from 'lodash-es';
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
import { exitWithErrorMessage } from '../lib/error-helpers';
import { addWatchMode } from '../lib/watch-mode-helpers';

const TERMINAL_COLS = process.stdout.columns - 10 || 100;

const program = new DmnoCommand('resolve')
  .summary('Loads config schema and resolves config values')
  .description('Loads the resolved config for a service')
  .option('-f,--format <format>', 'format to output resolved config (ex. json)')
  .option('--public', 'only loads public (non-sensitive) values')
  .option('--show-all', 'shows all items, even when config is failing')
  .example('dmno resolve', 'Loads the resolved config for the root service')
  .example('dmno resolve --service service1', 'Loads the resolved config for service1')
  .example('dmno resolve --service service1 --format json', 'Loads the resolved config for service1 in JSON format');

addWatchMode(program); // must be first
addServiceSelection(program);
addCacheFlags(program);



program.action(async (opts: {
  // these args should be handled already by the helpers
  // service?: string,
  // watch?: boolean,
  // skipCache?: boolean,
  // clearCache?: boolean,

  format?: string,
  public?: boolean,
  showAll?: boolean,
}, thisCommand) => {
  const ctx = getCliRunCtx();

  if (opts.format) ctx.expectingOutput = true;

  // TODO: should probably toggle on some "silent" mode and then run all logs through a helper

  if (!ctx.selectedService) return; // error message already handled


  ctx.log(`\nResolving config for service ${kleur.magenta(ctx.selectedService.serviceName)}\n`);

  const workspace = ctx.workspace!;

  // // first display loading errors (which would likely cascade into schema errors)
  // if (_.some(_.values(workspace.allServices), (s) => s.configLoadError)) {
  //   console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline('We were unable to load all of your config')}  🚨 🚨 🚨\n`);
  //   console.log(kleur.gray('The following services are failing to load:\n'));

  //   // NOTE - we dont use a table here because word wrapping within the table
  //   // breaks clicking/linking into your code

  //   _.each(workspace.allServices, (service) => {
  //     if (!service.configLoadError) return;
  //     console.log(kleur.bold().red(`💥 Service ${kleur.underline(service.serviceName)} failed to load 💥\n`));

  //     console.log(kleur.bold(service.configLoadError.message), '\n');

  //     console.log(service.configLoadError.cleanedStack?.join('\n'), '\n');
  //   });
  //   return ctx.exit();
  // }

  // console.dir(workspace.services.root.config, { depth: null });
  // console.dir(workspace.plugins, { depth: null });

  // now show plugin errors - which would also likely cause further errors
  if (_.some(_.values(workspace.plugins), (p) => !p.isValid)) {
    console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline('Your plugins were unable to initialize correctly')}  🚨 🚨 🚨\n`);

    _.each(workspace.plugins, (plugin) => {
      _.each(plugin.inputItems, (item) => {
        if (item.isValid) return;

        console.log();

        console.log([
          kleur.blue(plugin.initByService?.serviceName || ''),
          `${kleur.gray(' > ')}${plugin.instanceName}`,
          `${kleur.gray(' > ')}${item.key}`,
        ].join(''));

        console.log(formattedValue(item.resolvedValue, false));

        const errors = _.compact([
          item.coercionError,
          ...item.validationErrors || [],
          item.schemaError,
        ]);
        console.log(errors?.map((err) => err.message).join('\n'));
      });
    });


    return ctx.exit();
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
    return ctx.exit();
  }

  if (!ctx.selectedService) {
    return exitWithErrorMessage(
      'You must select a specific service',
      ['try re-running with the `-s` flag'],
    );
  }

  const service = ctx.selectedService;
  await service.resolveConfig();

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

    return ctx.exit();
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
    _.each(service.config, (item) => {
      console.log(getItemSummary(item.toJSON()));
    });
  }
});

export const ResolveCommand = program;
