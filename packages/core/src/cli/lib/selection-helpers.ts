import { Command } from 'commander';
import _ from 'lodash-es';
import kleur from 'kleur';
import { select } from '@inquirer/prompts';
import { ConfigLoaderProcess } from './loader-process';
import { exitWithErrorMessage } from './error-helpers';
import { SerializedDmnoPlugin, SerializedService } from '../../config-loader/serialization-types';
import { fallingDmnoLoader } from './loaders';
import { getCliRunCtx } from './cli-ctx';

function getMaxLength(strings: Array<string>, extraBuffer = 4) {
  let max = 0;
  for (let i = 0; i < strings.length; i++) {
    if (strings[i].length > max) max = strings[i].length;
  }
  if (max) max += extraBuffer;
  return max;
}


function getServiceLabel(s: SerializedService, padNameEnd: number) {
  return [
    `- ${s.serviceName.padEnd(padNameEnd)}`,
    kleur.gray(s.packageName),
  ].join(' ');
}

export function addServiceSelection(program: Command, selectionRequired = true) {
  return program
    .option('-s, --service <service>', 'which service to load')
    .hook('preAction', async (thisCommand, actionCommand) => {
      const ctx = getCliRunCtx();

      // const [,workspace] = await Promise.all([
      //   await fallingDmnoLoader(750),
      //   await ctx.configLoader.makeRequest('load-full-schema'),
      // ]);
      const workspace = await ctx.configLoader.makeRequest('load-full-schema');


      const namesMaxLen = getMaxLength(_.map(workspace.services, (s) => s.serviceName));

      ctx.workspace = workspace;



      // first display loading errors (which would likely cascade into schema errors)
      if (_.some(workspace.services, (s) => s.configLoadError)) {
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



      const explicitSelection = thisCommand.opts().service;
      if (explicitSelection) {
        if (!_.find(workspace.services, (s) => s.serviceName === explicitSelection)) {
          exitWithErrorMessage(
            `Invalid service selection: ${kleur.bold(explicitSelection)}`,
            [
              'Maybe you meant one of:',
              ..._.map(workspace.services, (s) => getServiceLabel(s, namesMaxLen)),
            ],
          );
        }
        return;
      }

      if (!selectionRequired) return;

      let autoSelectService: SerializedService | undefined;

      // filled by package manager with package name if running an package.json script
      if (process.env.npm_package_name) {
        autoSelectService = _.find(workspace.services, (service) => {
          return service.packageName === process.env.npm_package_name;
        });

        // This fully selects it and moves on
        // TODO: not totally sure, so we should see how this feels...
        if (autoSelectService) {
          thisCommand.opts().service = autoSelectService.serviceName;
          return;
        }
      }


      // try to select based on current working directory
      // this pre-selects the menu, but does not continue automatically
      // NOTE - `pnpm --filter=child-package exec dmno` changes the cwd correctly
      if (!autoSelectService) {
        // order our services by folder depth (descending)
        // so we can look for whiuch folder the user is in
        const servicesOrderedByDirDepth = _.orderBy(workspace.services, (s) => s.path.split('/').length, ['desc']);

        const cwd = process.cwd();
        autoSelectService = _.find(servicesOrderedByDirDepth, (service) => {
          return cwd.includes(service.path);
        });
      }

      const menuSelection = await select({
        message: 'Which service?',
        choices: _.map(workspace.services, (service) => ({
          name: getServiceLabel(service, namesMaxLen),
          value: service.serviceName,
        })),
        default: autoSelectService?.serviceName,
      });
      thisCommand.opts().service = menuSelection;
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


function getPluginLabel(p: SerializedDmnoPlugin, padNameEnd: number) {
  return [
    `- ${p.instanceName}`.padEnd(padNameEnd),
    kleur.gray(`${p.pluginType}`),
    kleur.gray(`| ${p.initializedInService}`),
  ].join(' ');
}
function getPluginDescription(p: SerializedDmnoPlugin) {
  return kleur.gray(`type = ${p.pluginType}, initialized in ${p.initializedInService}`);
}


export function addPluginSelection(program: Command) {
  return program
    .option('-p, --plugin <plugin>', 'which plugin instance to interact with')
    .hook('preAction', async (thisCommand, actionCommand) => {
      const ctx = getCliRunCtx();

      const workspace = ctx.workspace || await ctx.configLoader.makeRequest('load-full-schema');

      const allPlugins = _.flatMap(workspace.services, (service) => {
        return _.map(service.plugins);
      });
      const allPluginsByInstanceName = _.keyBy(allPlugins, (p) => p.instanceName);

      const namesMaxLen = getMaxLength(_.map(allPlugins, (p) => p.instanceName));

      const explicitSelection = thisCommand.opts().plugin;
      if (explicitSelection) {
        ctx.selectedPlugin = allPluginsByInstanceName[explicitSelection];
        if (!ctx.selectedPlugin) {
          exitWithErrorMessage(
            `Invalid plugin selection: ${kleur.bold(explicitSelection)}`,
            [
              'Maybe you meant one of:',
              ..._.map(allPlugins, (p) => getPluginLabel(p, namesMaxLen)),
            ],
          );
        }
        return;
      }

      const menuSelection = await select({
        message: 'Which plugin instance?',
        choices: _.flatMap(workspace.services, (service) => {
          return _.map(service.plugins, (plugin) => ({
            name: getPluginLabel(plugin, namesMaxLen),
            // description: getPluginDescription(plugin),
            value: plugin.instanceName,
          }));
        }),
        // default: autoSelectService?.serviceName,
      });
      thisCommand.opts().plugin = menuSelection;
      ctx.selectedPlugin = allPluginsByInstanceName[menuSelection];
    });
}

// if (!selectionRequired) return;
