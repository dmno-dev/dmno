import _ from 'lodash-es';
import {
  ConfigItemDefinition, ConfigPath, ResolverContext, TypeExtendsDefinition,
} from './config-engine';
import { DmnoDataType, DmnoDataTypeFactoryFn } from './base-types';
import { ConfigValueResolver } from './resolvers/resolvers';

export type ClassOf<T> = new (...args: Array<any>) => T;


type PluginSchemaItemDefinition = {
  /** is this input required */
  required?: boolean;
  /** data type of this input */
  extends?: TypeExtendsDefinition,
};

export abstract class DmnoPlugin {
  /** schema for the inputs this plugin needs */
  protected inputSchema?: Record<string, PluginSchemaItemDefinition> = {};
}


export function createDmnoPlugin<Resolvers extends { [fnName: string]: (...args: Array<any>) => ConfigValueResolver }>(
  opts: {
    inputSchema?: Record<string, PluginSchemaItemDefinition>,
    resolvers: Resolvers,
  }) {
  return {
    init() {
      return { ...opts.resolvers };
    },

  };
}
class DmnoPluginInternal<Inputs> {

}



// TODO: this is a pretty naive approach to capturing the plugins while loading config
// probably should move to something like AsnycLocalStorage to create a more flexible

let injectablePlugins: Record<string, DmnoPlugin> = {};
let currentPlugins: Record<string, DmnoPlugin> = {};
let processingRootConfig = false;

export function startPluginRegistration(isRoot = false) {
  processingRootConfig = isRoot;
  currentPlugins = {};
  // return a reference so the loader executable can have a reference to all the plugins after loading a service
  return currentPlugins;
}
export function finishPluginRegistration() {
  if (processingRootConfig) {
    injectablePlugins = currentPlugins;
    processingRootConfig = false;
  }
}

export function registerPlugin<T extends DmnoPlugin>(plugin: T) : T;
export function registerPlugin<T extends DmnoPlugin>(name: string, plugin: T): T;
export function registerPlugin<T extends DmnoPlugin>(nameOrPlugin: string | T, pluginOrUndefined?: T) {
  const name = _.isString(nameOrPlugin) ? nameOrPlugin : undefined;
  const plugin = _.isString(nameOrPlugin) ? pluginOrUndefined! : nameOrPlugin;

  const injectionName = _.compact([plugin.constructor.name, name]).join('/');
  currentPlugins[injectionName] = plugin;

  return plugin;
}


export function injectPlugin<T extends DmnoPlugin>(pluginClass: ClassOf<T>) : T;
export function injectPlugin<T extends DmnoPlugin>(name: string, pluginClass: ClassOf<T>): T;
export function injectPlugin<T extends DmnoPlugin>(
  nameOrPluginClass: string | ClassOf<T>,
  pluginClassOrUndefined?: ClassOf<T>,
) {
  const name = _.isString(nameOrPluginClass) ? nameOrPluginClass : undefined;
  const pluginClass = _.isString(nameOrPluginClass) ? pluginClassOrUndefined! : nameOrPluginClass;

  const injectionName = _.compact([pluginClass.name, name]).join('/');

  const pluginToInject = injectablePlugins[injectionName];
  // console.log('try to inject plugin', injectionName, injectablePlugins, pluginToInject ? 'FOUND!' : 'not found :(');
  if (!pluginToInject) {
    throw new Error(`Unable to inject plugin ${injectionName}`);
  }

  return pluginToInject as T;
}
