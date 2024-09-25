import _ from 'lodash-es';
import Debug from 'debug';

import {
  ConfigraphPlugin,
  SchemaError,
} from '@dmno/configraph';

import {
  DmnoService, DmnoWorkspace,
} from './config-engine';
import { DmnoConfigraphNode, DmnoConfigraphServiceEntity, DmnoDataTypeMetadata } from './configraph-adapter';
import { SerializedDmnoPlugin } from '../config-loader/serialization-types';

const debug = Debug('dmno:plugins');

let allPlugins: Record<string, DmnoPlugin> = {};
let initializedPluginInstanceNames: Array<string> = [];
let injectedPluginInstanceNames: Array<string> = [];

export type { PluginInputValue } from '@dmno/configraph';

export class InjectedPluginDoesNotExistError extends SchemaError {}

export abstract class DmnoPlugin extends ConfigraphPlugin<
DmnoDataTypeMetadata, DmnoConfigraphServiceEntity
> {
  static cliPath?: string;
  // these 2 should be required, but TS currently does not support static abstract
  static pluginPackageName: string;
  static pluginPackageVersion: string;
  private getStaticProp(key: 'cliPath' | 'pluginPackageName' | 'pluginPackageVersion') {
    const PluginClass = this.constructor as typeof DmnoPlugin;
    return PluginClass[key];
  }
  get cliPath() { return this.getStaticProp('cliPath'); }
  get pluginPackageName() { return this.getStaticProp('pluginPackageName'); }
  get pluginPackageVersion() { return this.getStaticProp('pluginPackageVersion'); }

  EntityClass = DmnoConfigraphServiceEntity;

  constructor(...args: ConstructorParameters<typeof ConfigraphPlugin<DmnoDataTypeMetadata>>) {
    super(...args);
    // instanceId set in super() call
    allPlugins[this.instanceId] = this;
    initializedPluginInstanceNames.push(this.instanceId);
  }

  static injectInstance<T extends DmnoPlugin>(
    this: new (...args: Array<any>) => T,
    instanceName: string,
  ) {
    if (!allPlugins[instanceName]) {
      throw new InjectedPluginDoesNotExistError('plugin injection failed');
    }
    injectedPluginInstanceNames.push(instanceName);
    return allPlugins[instanceName] as T;
  }

  toJSON(): SerializedDmnoPlugin {
    return {
      ...this.toCoreJSON(),
      inputNodes: _.mapValues(this.internalEntity?.configNodes, (n) => n.toJSON()),
    };
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
}
