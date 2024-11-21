import kleur from 'kleur';
import _ from 'lodash-es';
import { ConfigLoadError } from '@dmno/configraph';
import { CliExitError } from '../cli/lib/cli-error';

import {
  formatError, formattedValue, getItemSummary, joinAndCompact,
} from '../cli/lib/formatting';
import { SerializedService, SerializedWorkspace } from '../config-loader/serialization-types';

export function checkForSchemaErrors(workspace: SerializedWorkspace) {
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

      if (service.configLoadError instanceof ConfigLoadError) {
        console.log(service.configLoadError.cleanedStack?.join('\n'), '\n');
      }
    });
    throw new CliExitError('Unable to load all config files');
  }

  // now show plugin errors - which would also likely cause further errors
  if (_.some(_.values(workspace.plugins), (p) => !p.isValid)) {
    console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline('Your plugins were unable to initialize correctly')}  🚨 🚨 🚨\n`);

    _.each(workspace.plugins, (plugin) => {
      _.each(plugin.inputNodes, (item) => {
        if (item.isValid) return;

        console.log(kleur.red('Failing plugin input ------------------'));

        console.log([
          `${plugin.parentEntityId || ''} ${kleur.gray('(service)')}`,
          `${kleur.gray('└')}${plugin.instanceId} ${kleur.gray('(plugin instance)')}`,
          ` ${kleur.gray('└')}${item.key} ${kleur.gray('(input key)')}`,
        ].join('\n'));

        console.log(`\n${kleur.underline('Input value')}: ${formattedValue(item.resolvedValue, false)}`);

        const errors = _.compact([
          item.coercionError,
          ...item.validationErrors || [],
          ...item.schemaErrors || [],
        ]);
        console.log(`\n${kleur.underline('Error(s)')}:`);
        console.log(errors?.map((err) => `- ${err.message}`).join('\n'));
        console.log('');
      });
    });

    throw new CliExitError('Plugin initialization errors');
  }

  // now show schema errors
  const servicesWithSchemaErrors = _.values(workspace.services).filter(
    (s) => s.schemaErrors?.length || _.some(_.values(s.configNodes), (i) => !i.isSchemaValid),
  );
  if (servicesWithSchemaErrors.length) {
    console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline('Your config schema is invalid')}  🚨 🚨 🚨\n`);
    console.log(kleur.gray('The following services have issues:\n'));

    // TODO: clean up this formatting!
    _.each(servicesWithSchemaErrors, (service) => {
      console.log(`Service: ${kleur.green(service.serviceName)}`);
      _.each(service.schemaErrors, (err) => {
        console.log(formatError(err));
      });
      const invalidSchemaItems = _.values(service.configNodes).filter((i) => !i.isSchemaValid);
      _.each(invalidSchemaItems, (item) => {
        console.log(`> ${item.key}`);
        console.log(item.schemaErrors?.map(formatError).join('\n'));
      });
    });
    throw new CliExitError('Config schema errors');
  }
}

export function checkForConfigErrors(service: SerializedService, opts?: {
  showAll?: boolean
}) {
  const failingItems = _.filter(service.configNodes, (item) => item.validationState === 'error');

  // TODO: make isValid flag on service to work
  if (failingItems.length > 0) {
    console.log(`\n🚨 🚨 🚨  ${kleur.bold().underline(`Configuration of service "${kleur.magenta(service.serviceName)}" is currently invalid `)}  🚨 🚨 🚨\n`);
    console.log('Invalid items:\n');

    _.each(failingItems, (item) => {
      console.log(getItemSummary(item));
      console.log();
    });
    if (opts?.showAll) {
      console.log();
      console.log(joinAndCompact([
        'Valid items:',
        kleur.italic().gray('(remove `--show-all` flag to hide)'),
      ]));
      console.log();
      const validItems = _.filter(service.configNodes, (i) => !!i.isValid);
      _.each(validItems, (item) => {
        console.log(getItemSummary(item));
      });
    }

    throw new CliExitError('Resolved config did not pass validation');
  }
}


export function checkServiceIsValid(service: SerializedService, log = true) {
  if (service.configLoadError) {
    console.log('🚨 🚨 🚨  unable to load config schema  🚨 🚨 🚨');
    console.log(formatError(service.configLoadError));
    return false;
  }
  // plugins!

  if (service.schemaErrors?.length) {
    console.log('🚨 🚨 🚨  config schema is invalid  🚨 🚨 🚨');
    console.log(service.schemaErrors.forEach((err) => {
      console.log(formatError(err));
    }));
    return false;
  }

  const failingItems = Object.values(service.configNodes).filter((c) => !c.isValid);
  if (failingItems.length) {
    console.log('🚨 🚨 🚨  config is invalid  🚨 🚨 🚨');
    failingItems.forEach((item) => {
      console.log(getItemSummary(item));
      console.log();
    });
    return false;
  }

  return true;
}
