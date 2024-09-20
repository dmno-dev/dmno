import _ from 'lodash-es';
import Debug from 'debug';

import {
  ConfigraphPlugin,
  SchemaError,
} from '@dmno/configraph';

import {
  DmnoService, DmnoWorkspace,
} from './config-engine';
import { DmnoDataTypeMetadata } from './configraph-adapter';

const debug = Debug('dmno:plugins');

let allPlugins: Record<string, DmnoPlugin> = {};
let initializedPluginInstanceNames: Array<string> = [];
let injectedPluginInstanceNames: Array<string> = [];

export type { PluginInputValue } from '@dmno/configraph';

export class InjectedPluginDoesNotExistError extends SchemaError {}

export abstract class DmnoPlugin extends ConfigraphPlugin<DmnoDataTypeMetadata> {
  constructor(...args: ConstructorParameters<typeof ConfigraphPlugin<DmnoDataTypeMetadata>>) {
    super(...args);
    allPlugins[args[0]] = this;
    initializedPluginInstanceNames.push(this.instanceId);
  }

  static injectInstance<T extends DmnoPlugin>(
    this: new (...args: Array<any>) => T,
    instanceName: string,
  ) {
    console.log('inject plugin!', instanceName);
    if (!allPlugins[instanceName]) {
      throw new InjectedPluginDoesNotExistError('plugin injection failed');
    }
    injectedPluginInstanceNames.push(instanceName);
    return allPlugins[instanceName] as T;
  }
}

export function beginWorkspaceLoadPlugins(workspace: DmnoWorkspace) {
  allPlugins = workspace.plugins;
}

export function beginServiceLoadPlugins() {
  initializedPluginInstanceNames = [];
  injectedPluginInstanceNames = [];
}
export function finishServiceLoadPlugins(service: DmnoService) {
  debug('finish loading plugins for service', service.serviceName, injectedPluginInstanceNames, initializedPluginInstanceNames);
  service.injectedPluginNames = injectedPluginInstanceNames;
  service.ownedPluginNames = initializedPluginInstanceNames;

  // _.each(injectedPluginInstanceNames, (pName) => {
  //   allPlugins[pName].injectedByEntities ||= [];
  //   allPlugins[pName].injectedByEntities?.push(service);
  // });
  // _.each(initializedPluginInstanceNames, (pName) => {
  //   allPlugins[pName].ownedByEntity = service;
  // });
}
