import _ from 'lodash-es';
import Debug from 'debug';

import {
  ConfigraphPlugin, ConfigraphPluginInputItem, ConfigraphPluginInputMap, ConfigraphPluginInputSchema,
} from '@dmno/configraph';

import {
  DmnoService, DmnoWorkspace,
} from './config-engine';

const debug = Debug('dmno:plugins');

let allPlugins: Record<string, DmnoPlugin> = {};
let initializedPluginInstanceNames: Array<string> = [];
let injectedPluginInstanceNames: Array<string> = [];


export abstract class DmnoPlugin<
ChildPlugin extends ConfigraphPlugin = NoopDmnoPlugin,
> extends ConfigraphPlugin<ChildPlugin> {
  constructor(instanceName: string, inputMap: any) {
    super(instanceName);

    initializedPluginInstanceNames.push(instanceName);

    if (!allPlugins[instanceName]) {
      console.log('creating plugin!', instanceName);
      allPlugins[instanceName] = this;
      this.setInputMap(inputMap);
    } else {
      console.log('using existing plugin during create');
      // TODO: check for double create call
      allPlugins[instanceName].setInputMap(inputMap);
      // eslint-disable-next-line no-constructor-return
      return allPlugins[instanceName] as any;
    }
  }

  // static create<T extends DmnoPlugin>(
  //   this: new (...args: Array<any>) => T,
  //   instanceName: string,
  //   //! need to figure out how to get typing on the input map, but cannot access type params on static methods
  //   inputMap?: any,
  // ) {
  //   if (!allPlugins[instanceName]) {
  //     console.log('creating plugin!', instanceName, inputMap);
  //     allPlugins[instanceName] = new this(instanceName, inputMap);
  //   } else {
  //     console.log('using existing plugin during create');
  //   }
  //   // TODO: check for double create call
  //   allPlugins[instanceName].setInputMap(inputMap);

  //   initializedPluginInstanceNames.push(instanceName);

  //   return allPlugins[instanceName] as T;
  // }

  static injectInstance<T extends DmnoPlugin>(
    this: new (...args: Array<any>) => T,
    instanceName: string,
  ) {
    console.log('inject plugin!', instanceName);
    if (!allPlugins[instanceName]) {
      allPlugins[instanceName] = new this(instanceName);
    }
    injectedPluginInstanceNames.push(instanceName);
    return allPlugins[instanceName] as T;
  }
}
class NoopDmnoPlugin extends DmnoPlugin {}

export const DmnoPluginInputItem = ConfigraphPluginInputItem;
export type DmnoPluginInputSchema = ConfigraphPluginInputSchema;
export type DmnoPluginInputMap<S extends ConfigraphPluginInputSchema> = ConfigraphPluginInputMap<S>;
export { _PluginInputTypesSymbol, ConfigPath, configPath } from '@dmno/configraph';


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
