import { Command } from 'commander';
import _ from 'lodash-es';
import kleur from 'kleur';
import { select } from '@inquirer/prompts';
import { exitWithErrorMessage } from './error-helpers';
import { SerializedDmnoPlugin, SerializedService } from '../../config-loader/serialization-types';
import { fallingDmnoLoader } from './loaders';
import { getCliRunCtx } from './cli-ctx';
import { DmnoService, DmnoWorkspace } from '../../config-engine/config-engine';
import { DmnoPlugin } from '../../config-engine/plugins';

function getMaxLength(strings: Array<string>, extraBuffer = 4) {
  let max = 0;
  for (let i = 0; i < strings.length; i++) {
    if (strings[i].length > max) max = strings[i].length;
  }
  if (max) max += extraBuffer;
  return max;
}


function getServiceLabel(s: DmnoService, padNameEnd: number) {
  return [
    `- ${s.serviceName.padEnd(padNameEnd)}`,
    kleur.gray(s.packageName),
  ].join(' ');
}

export function addServiceSelection(program: Command, opts?: {
  disableAutoSelect?: boolean,
  disableMenuSelect?: boolean,
  allowNoSelection?: boolean
}) {
  return program
    .option('-s, --service [service]', 'which service to load')
    .hook('preAction', async (thisCommand, actionCommand) => {
      const ctx = getCliRunCtx();

      const workspace = await ctx.configLoader.getWorkspace();
      ctx.workspace = workspace;

      const namesMaxLen = getMaxLength(_.map(workspace.allServices, (s) => s.serviceName));

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
        console.log('bailing from schema load errors');
        return ctx.exit();
      }

      // handle explicit selection via the flag
      // if the user types just -s with no arg, we'll treat that as saying they want the menu
      const explicitMenuOptIn = thisCommand.opts().service === true;
      if (explicitMenuOptIn) {
        thisCommand.opts().service = undefined;
      }

      const explicitSelection = thisCommand.opts().service;
      if (!explicitMenuOptIn && explicitSelection) {
        ctx.selectedService = _.find(workspace.allServices, (s) => s.serviceName === explicitSelection);
        if (!ctx.selectedService) {
          return exitWithErrorMessage(
            `Invalid service selection: ${kleur.bold(explicitSelection)}`,
            [
              'Maybe you meant one of:',
              ..._.map(workspace.allServices, (s) => getServiceLabel(s, namesMaxLen)),
            ],
          );
        }
      }

      // handle auto-selection based on what package manager has passed in as the current package when running scripts via the package manager
      if (!explicitMenuOptIn && !opts?.disableAutoSelect) {
        // filled by package manager with package name if running an package.json script
        const packageName = process.env.npm_package_name || process.env.PNPM_PACKAGE_NAME;
        if (packageName) {
        // console.log('auto select package name', packageName);
          const autoServiceFromPackageManager = _.find(workspace.allServices, (service) => {
            return service.packageName === packageName;
          });

          // This fully selects it and moves on
          // TODO: not totally sure, so we should see how this feels...
          if (autoServiceFromPackageManager) {
            ctx.selectedService = autoServiceFromPackageManager;
            ctx.autoSelectedService = true;
            return;
          }
        }
      }

      // handle picking from a menu, default selection will be based on CWD
      // this pre-selects the menu, but does not continue automatically
      // NOTE - `pnpm --filter=child-package exec dmno` changes the cwd correctly
      if (explicitMenuOptIn || !opts?.disableMenuSelect) {
        // order our services by folder depth (descending)
        // so we can look for whiuch folder the user is in
        const servicesOrderedByDirDepth = _.orderBy(workspace.allServices, (s) => s.path.split('/').length, ['desc']);

        const cwd = process.cwd();
        const autoServiceFromCwd = _.find(servicesOrderedByDirDepth, (service) => {
          return cwd.includes(service.path);
        });

        const menuSelection = await select({
          message: 'Please select a service?',
          choices: _.map(workspace.allServices, (service) => ({
            name: getServiceLabel(service, namesMaxLen),
            value: service.serviceName,
          })),
          default: autoServiceFromCwd?.serviceName,
        });

        ctx.selectedService = _.find(workspace.allServices, (s) => s.serviceName === menuSelection);
        ctx.autoSelectedService = false;
        return;
      }

      if (!opts?.allowNoSelection) {
        exitWithErrorMessage('You must select a service');
      }
    });

  // .hook('postAction', async (thisCommand, actionCommand) => {
  //   console.log('postAction Hook!');
  //   console.log(thisCommand, actionCommand);
  // })
  // .hook('preSubcommand', async (thisCommand, actionCommand) => {
  //   console.log('preSubcommand Hook!');
  //   console.log(thisCommand, actionCommand);
  // });
}


function getPluginLabel(p: DmnoPlugin, padNameEnd: number) {
  return [
    `- ${p.instanceName}`.padEnd(padNameEnd),
    kleur.gray(`${p.pluginType}`),
    kleur.gray(`| ${p.initByService?.serviceName}`),
  ].join(' ');
}

export function addPluginSelection(program: Command) {
  return program
    .option('-p, --plugin <plugin>', 'which plugin instance to interact with')
    .hook('preAction', async (thisCommand, actionCommand) => {
      const ctx = getCliRunCtx();

      const workspace = await ctx.configLoader.getWorkspace();
      await workspace.resolveConfig();

      const pluginsArray = _.values(workspace.plugins);

      const namesMaxLen = getMaxLength(_.map(pluginsArray, (p) => p.instanceName));

      const explicitSelection = thisCommand.opts().plugin;
      if (explicitSelection) {
        ctx.selectedPlugin = workspace.plugins[explicitSelection];
        if (!ctx.selectedPlugin) {
          exitWithErrorMessage(
            `Invalid plugin selection: ${kleur.bold(explicitSelection)}`,
            [
              'Maybe you meant one of:',
              ..._.map(pluginsArray, (p) => getPluginLabel(p, namesMaxLen)),
            ],
          );
        }
        return;
      }

      const sortedPluginsArray = _.sortBy(pluginsArray, (p) => (p.cliPath ? 0 : 1));
      const menuSelection = await select({
        message: 'Which plugin instance?',
        choices: _.map(sortedPluginsArray, (plugin) => ({
          name: getPluginLabel(plugin, namesMaxLen),
          // description: getPluginDescription(plugin),
          value: plugin.instanceName,
          disabled: !plugin.cliPath && '(no cli)',
        })),
        // default: autoSelectService?.serviceName,
      });
      thisCommand.opts().plugin = menuSelection;
      ctx.selectedPlugin = workspace.plugins[menuSelection];
    });
}

// if (!selectionRequired) return;
