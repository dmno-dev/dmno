import { Command } from 'commander';
import _ from 'lodash-es';
import kleur from 'kleur';
import { select } from '@inquirer/prompts';
import { getCliRunCtx } from './cli-ctx';
import { DmnoService } from '../../config-engine/config-engine';
import { DmnoPlugin } from '../../config-engine/dmno-plugin';
import { getMaxLength } from './string-utils';
import { joinAndCompact } from './formatting';
import { CliExitError } from './cli-error';
import { SerializedDmnoPlugin } from '../../config-loader/serialization-types';


function getServiceLabel(s: { serviceName: string, packageName: string, configLoadError?: any }, padNameEnd: number) {
  return joinAndCompact([
    `- ${s.serviceName.padEnd(padNameEnd)}`,
    kleur.gray(s.packageName),
    s.configLoadError && kleur.red('  schema load error'),
  ], ' ');
}

export function addServiceSelection(program: Command, opts?: {
  disableAutoSelect?: boolean,
  disableMenuSelect?: boolean,
  allowNoSelection?: boolean,
  disablePrompt?: boolean,
}) {
  return program
    .option('-s, --service [service]', 'which service to load')
    .option('-np, --no-prompt', 'do not prompt for service selection')
    .hook('preAction', async (thisCommand, actionCommand) => {
      const ctx = getCliRunCtx();

      const workspace = await ctx.dmnoServer.makeRequest('loadFullSchema');
      ctx.workspace = workspace;

      const namesMaxLen = getMaxLength(_.map(workspace.services, (s) => s.serviceName));
      const disablePrompt = thisCommand.opts().noPrompt || opts?.disablePrompt;

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
      //   console.log('bailing from schema load errors');
      //   return ctx.exit();
      // }

      // handle re-selecting the same service on a restart, which could be a bit weird if the name(s) have changed
      // but we try to just select the same one and not worry too much
      if (ctx.isWatchModeRestart && ctx.selectedService) {
        ctx.selectedService = _.find(ctx.workspace.services, (s) => s.serviceName === ctx.selectedService!.serviceName)
          || _.find(ctx.workspace.services, (s) => s.packageName === ctx.selectedService!.packageName);

        if (ctx.selectedService) return;
      }


      // handle explicit selection via the flag
      // if the user types just -s with no arg, we'll treat that as saying they want the menu
      const explicitMenuOptIn = thisCommand.opts().service === true;
      if (explicitMenuOptIn) {
        thisCommand.opts().service = undefined;
      }

      const explicitSelection = thisCommand.opts().service;
      if (!explicitMenuOptIn && explicitSelection) {
        ctx.selectedService = _.find(workspace.services, (s) => s.serviceName === explicitSelection);
        if (ctx.selectedService) return;

        throw new CliExitError(`Invalid service selection: ${kleur.bold(explicitSelection)}`, {
          suggestion: [
            'Maybe you meant one of:',
            ..._.map(workspace.services, (s) => getServiceLabel(s, namesMaxLen)),
          ],
        });
      }

      // handle auto-selection based on what package manager has passed in as the current package when running scripts via the package manager
      if (!explicitMenuOptIn && !disablePrompt && !opts?.disableAutoSelect) {
        // filled by package manager with package name if running an package.json script
        const packageName = process.env.npm_package_name || process.env.PNPM_PACKAGE_NAME;
        if (packageName) {
        // console.log('auto select package name', packageName);
          const autoServiceFromPackageManager = _.find(workspace.services, (service) => {
            return service.packageName === packageName;
          });

          // This fully selects it and moves on
          // TODO: not totally sure, so we should see how this feels...
          if (autoServiceFromPackageManager && !disablePrompt) {
            ctx.selectedService = autoServiceFromPackageManager;
            ctx.autoSelectedService = true;
            return;
          }
        }
      }

      // handle picking from a menu, default selection will be based on CWD
      // this pre-selects the menu, but does not continue automatically
      // NOTE - `pnpm --filter=child-package exec dmno` changes the cwd correctly
      if (!thisCommand.opts().silent && (explicitMenuOptIn || !opts?.disableMenuSelect)) {
        // order our services by folder depth (descending)
        // so we can look for whiuch folder the user is in
        const servicesOrderedByDirDepth = _.orderBy(workspace.services, (s) => s.path.split('/').length, ['desc']);

        const cwd = process.cwd();
        const autoServiceFromCwd = _.find(servicesOrderedByDirDepth, (service) => {
          return cwd.includes(service.path);
        });

        const menuSelection = await select({
          message: 'Please select a service?',
          choices: _.map(workspace.services, (service) => ({
            name: getServiceLabel(service, namesMaxLen),
            value: service.serviceName,
          })),
          default: autoServiceFromCwd?.serviceName,
        });

        ctx.selectedService = _.find(workspace.services, (s) => s.serviceName === menuSelection);
        ctx.autoSelectedService = false;
        return;
      }

      if (!opts?.allowNoSelection) {
        throw new CliExitError('You must select a service', {
          suggestion: 'Try rerunning using -s flag',
        });
      }
    });
}

function getPluginLabel(p: SerializedDmnoPlugin, padNameEnd: number) {
  return [
    `- ${p.instanceId}`.padEnd(padNameEnd),
    kleur.gray(`${p.pluginType}`),
    kleur.gray(`| ${p.parentEntityId}`),
  ].join(' ');
}

export function addPluginSelection(program: Command) {
  return program
    .option('-p, --plugin <plugin>', 'which plugin instance to interact with')
    .hook('preAction', async (thisCommand, actionCommand) => {
      const ctx = getCliRunCtx();

      const workspace = await ctx.dmnoServer.getWorkspace();
      const pluginsArray = _.values(workspace.plugins);

      const namesMaxLen = getMaxLength(_.map(pluginsArray, (p) => p.instanceId));

      const explicitSelection = thisCommand.opts().plugin;
      if (explicitSelection) {
        ctx.selectedPlugin = workspace.plugins[explicitSelection];
        if (ctx.selectedPlugin) return;

        throw new CliExitError(`Invalid plugin selection: ${kleur.bold(explicitSelection)}`, {
          suggestion: [
            'Maybe you meant one of:',
            ..._.map(pluginsArray, (p) => getPluginLabel(p, namesMaxLen)),
          ],
        });
      }

      const sortedPluginsArray = _.sortBy(pluginsArray, (p) => (p.cliPath ? 0 : 1));
      const menuSelection = await select({
        message: 'Which plugin instance?',
        choices: _.map(sortedPluginsArray, (plugin) => ({
          name: getPluginLabel(plugin, namesMaxLen),
          // description: getPluginDescription(plugin),
          value: plugin.instanceId,
          disabled: !plugin.cliPath && '(no cli)',
        })),
        // default: autoSelectService?.serviceName,
      });
      thisCommand.opts().plugin = menuSelection;
      ctx.selectedPlugin = workspace.plugins[menuSelection];
    });
}
