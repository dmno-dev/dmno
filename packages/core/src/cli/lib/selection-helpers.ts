import { Command } from 'commander';
import * as _ from 'lodash-es';
import kleur from 'kleur';
import { select } from '@inquirer/prompts';
import Debug from 'debug';
import { getCliRunCtx } from './cli-ctx';
import { getMaxLength } from './string-utils';
import { joinAndCompact } from './formatting';
import { CliExitError } from './cli-error';
import { SerializedDmnoPlugin } from '../../config-loader/serialization-types';

const debug = Debug('dmno:cli');

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

      // handle re-selecting the same service on a restart, which could be a bit weird if the name(s) have changed
      // but we try to just select the same one and not worry too much
      if (ctx.isWatchModeRestart && ctx.selectedService) {
        ctx.selectedService = _.find(ctx.workspace.services, (s) => s.serviceName === ctx.selectedService!.serviceName)
          || _.find(ctx.workspace.services, (s) => s.packageName === ctx.selectedService!.packageName);

        if (ctx.selectedService) return;
      }

      const noPromptMode = thisCommand.opts().silent || opts?.disablePrompt || thisCommand.opts().prompt === false;

      // handle explicit selection via the flag
      // if the user types just -s with no arg, we'll treat that as saying they want the menu
      const explicitMenuOptIn = thisCommand.opts().service === true;
      if (explicitMenuOptIn) {
        debug('user explicitly opted into service selection menu');
        thisCommand.opts().service = undefined;
        if (thisCommand.opts().prompt === false) {
          throw new CliExitError('Cannot use --no-prompt when opting into selection menu (--service/-s without a service name)');
        }
      }

      if (!explicitMenuOptIn) {
        // first handle explicit selection of a service via the --service/-s flag
        const explicitSelection = thisCommand.opts().service;
        if (explicitSelection) {
          ctx.selectedService = _.find(workspace.services, (s) => s.serviceName === explicitSelection);
          debug(`user explicitly selected service: ${ctx.selectedService?.serviceName}`);
          if (ctx.selectedService) return;

          throw new CliExitError(`Invalid service selection: ${kleur.bold(explicitSelection)}`, {
            suggestion: [
              'Maybe you meant one of:',
              ..._.map(workspace.services, (s) => getServiceLabel(s, namesMaxLen)),
            ],
          });
        }

        // if only a single service exists, we can just select it
        if (_.keys(workspace.services).length === 1) {
          ctx.selectedService = _.values(workspace.services)[0];
          debug(`auto-selected service because only 1 service exists: ${ctx.selectedService?.serviceName}`);
          return;
        }
      }

      // filled by package manager with package name if running an package.json script
      const packageNameFromPackageManager = process.env.npm_package_name || process.env.PNPM_PACKAGE_NAME;
      let autoSelectedService = _.find(workspace.services, (service) => {
        return service.packageName === packageNameFromPackageManager;
      });
      debug(`auto-detected service using package manager env vars: ${autoSelectedService?.serviceName}`);

      if (!autoSelectedService) {
        const cwd = process.cwd();
        autoSelectedService = _.find(workspace.services, (service) => {
          // looks for an exact match of cwd (must be at the root of the service)
          return cwd === service.path;
        });
        debug(`auto-detected service using CWD (exact match): ${autoSelectedService?.serviceName}`);
      }

      // autoselect a service if we have one and that has not been disallowed
      // NOTE - `pnpm --filter=child-package exec dmno` changes the cwd correctly
      if (!opts?.disableAutoSelect && !explicitMenuOptIn && autoSelectedService) {
        ctx.selectedService = autoSelectedService;
        ctx.autoSelectedService = true;
        debug(`auto selecting service: ${ctx.selectedService?.serviceName}`);
        return;
      }


      // if nothing auto-selected, we'll still try to guess based on cwd but more loosely
      if (!autoSelectedService) {
        const cwd = process.cwd();
        const servicesOrderedByDirDepth = _.orderBy(workspace.services, (s) => s.path.split('/').length, ['desc']);
        autoSelectedService = _.find(servicesOrderedByDirDepth, (service) => {
          return cwd.includes(service.path);
        });
        debug(`auto-detected service using CWD (loose match): ${autoSelectedService?.serviceName}`);
      }

      // if the user has explicitly opted into NOT showing the menu, we'll be more lenient in our auto-selection
      if (noPromptMode) {
        if (autoSelectedService) {
          ctx.selectedService = autoSelectedService;
          ctx.autoSelectedService = true;
          debug(`auto selecting service because prompting disabled: ${ctx.selectedService?.serviceName}`);
          return;
        }
        throw new CliExitError('Unable to auto-select a service, and selection menu is currently disabled', {
          suggestion: 'Try using -s flag to select a specific service',
        });
      }

      if (!noPromptMode) {
        const menuSelection = await select({
          message: 'Please select a service?',
          choices: _.map(workspace.services, (service) => ({
            name: getServiceLabel(service, namesMaxLen),
            value: service.serviceName,
          })),
          default: autoSelectedService?.serviceName,
        });

        ctx.selectedService = _.find(workspace.services, (s) => s.serviceName === menuSelection);
        ctx.autoSelectedService = false;
        debug(`selected service using menu: ${ctx.selectedService?.serviceName}`);
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
