import * as _ from 'lodash-es';
import Debug from 'debug';

import {
  ConfigraphPlugin,
  SchemaError,
} from '@dmno/configraph';

import {
  DmnoService, DmnoWorkspace,
} from './config-engine';
import { DmnoConfigraphServiceEntity, DmnoDataTypeMetadata } from './configraph-adapter';
import { SerializedDmnoPlugin } from '../config-loader/serialization-types';

const debug = Debug('dmno:plugins');

let allPlugins: Record<string, DmnoPlugin> = {};
let initializedPluginInstanceIds: Array<string> = [];
let injectedPluginInstanceIds: Array<string> = [];

export type { PluginInputValue } from '@dmno/configraph';

export class InjectedPluginDoesNotExistError extends SchemaError {}

export abstract class DmnoPlugin extends ConfigraphPlugin<
DmnoDataTypeMetadata, DmnoConfigraphServiceEntity
> {
  static cliPath?: string;
  // these 2 should be required, but TS currently does not support static abstract
  // static pluginPackageName: string;
  // static pluginPackageVersion: string;

  private getStaticProp(key: 'cliPath') {
    const PluginClass = this.constructor as typeof DmnoPlugin;
    return PluginClass[key];
  }
  get cliPath() { return this.getStaticProp('cliPath'); }
  // get pluginPackageName() { return this.getStaticProp('pluginPackageName'); }
  // get pluginPackageVersion() { return this.getStaticProp('pluginPackageVersion'); }

  EntityClass = DmnoConfigraphServiceEntity;

  constructor(...args: ConstructorParameters<typeof ConfigraphPlugin<DmnoDataTypeMetadata>>) {
    super(...args);
    // instanceId set in super() call
    allPlugins[this.instanceId] = this;
    initializedPluginInstanceIds.push(this.instanceId);
  }

  static injectInstance<T extends DmnoPlugin>(
    this: new (...args: Array<any>) => T,
    instanceName: string,
  ) {
    if (!allPlugins[instanceName]) {
      throw new InjectedPluginDoesNotExistError('plugin injection failed');
    }
    injectedPluginInstanceIds.push(instanceName);
    return allPlugins[instanceName] as T;
  }

  injectingEntityIds: Array<string> = [];

  toJSON(): SerializedDmnoPlugin {
    return {
      ...this.toCoreJSON(),
      cliPath: this.cliPath,
      inputNodes: _.mapValues(this.internalEntity?.configNodes, (n) => n.toJSON()),
    };
  }
}

export function beginWorkspaceLoadPlugins(workspace: DmnoWorkspace) {
  allPlugins = workspace.plugins;
}

export function beginServiceLoadPlugins() {
  initializedPluginInstanceIds = [];
  injectedPluginInstanceIds = [];
}
export function finishServiceLoadPlugins(service: DmnoService) {
  debug('finish loading plugins for service', service.serviceName, injectedPluginInstanceIds, initializedPluginInstanceIds);
  service.injectedPluginIds = injectedPluginInstanceIds;
  service.ownedPluginIds = initializedPluginInstanceIds;
}
