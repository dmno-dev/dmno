/*
  These types are used to define how our config is sent over the wire

  We make sure that our objects know how to serialize to these shapes and use them in our IPC requests
  to know what shapes to expect on both sides of the communication

  NOTE - by heavily using Pick<T>, we get to preserve the definition (including comments) from the actual classes
  and force us to use the same name internally and when we send over the wire
*/

import { DmnoDataType } from '../config-engine/base-types';
import {
  ConfigItemDefinition, DmnoConfigItemBase, DmnoService, InjectedDmnoEnv,
} from '../config-engine/config-engine';
import { DmnoPlugin, DmnoPluginInputItem } from '../config-engine/plugins';
import { ConfigValueOverride, ConfigValueResolver } from '../config-engine/resolvers/resolvers';


export type SerializedWorkspace = {
  services: Record<string, SerializedService>,
  plugins: Record<string, SerializedDmnoPlugin>,

};

export type SerializedService =
  Pick<DmnoService, 'packageName' | 'serviceName' | 'path'>
  & {
    isSchemaValid: boolean,
    isValid: boolean,
    isResolved: boolean,
    configLoadError?: SerializedDmnoError,
    schemaErrors?: Array<SerializedDmnoError>,
    ownedPluginNames: Array<string>,
    injectedPluginNames: Array<string>,
    config: Record<string, SerializedConfigItem>,
    injectedEnv: InjectedDmnoEnv,
  };

export type SerializedDmnoPlugin = Pick<DmnoPlugin, 'pluginType' | 'instanceName' | 'isValid'>
& {
  cliPath?: string,
  initializedInService: string,
  injectedIntoServices: Array<string>,
  inputs: Record<string, SerializedDmnoPluginInput>,
  usedByConfigItemResolverPaths?: Array<string>,
};
export type SerializedDmnoPluginInput = Pick<DmnoPluginInputItem, 'key' | 'isValid' | 'resolvedValue' | 'isResolved' | 'resolutionMethod'> & {
  isValid: boolean,
  mappedToItemPath?: string,
  coercionError?: SerializedDmnoError,
  validationErrors?: Array<SerializedDmnoError>,
  schemaError?: SerializedDmnoError,
};

export type SerializedConfigItem =
  Pick<DmnoConfigItemBase, 'key' | 'isValid' | 'isSchemaValid' | 'resolvedRawValue' | 'resolvedValue' | 'isResolved' | 'isDynamic'>
  & {
    dataType: SerializedDmnoDataType,
    children: Record<string, SerializedConfigItem>,
    coercionError?: SerializedDmnoError,
    validationErrors?: Array<SerializedDmnoError>,
    schemaErrors?: Array<SerializedDmnoError>,
    // TODO: dedupe some items from the resolver
    resolutionError?: SerializedDmnoError,
    resolver?: SerializedResolver,
    overrides?: Array<ConfigValueOverride>,
  };

export type SerializedResolver =
  Pick<ConfigValueResolver, 'isResolved'>
  & {
    icon?: string,
    label?: string,
    resolvedValue?: any,
    createdByPluginInstanceName?: string,
    branches?: Array<SerializedResolverBranch>,
    resolutionError?: SerializedDmnoError,
    // itemPath?: string;
    // branchIdPath?: string;
  };
export type SerializedResolverBranch = {
  label: string,
  isDefault: boolean,
  isActive: boolean | undefined,
  resolver: SerializedResolver,
};

export type SerializedDmnoDataType = Pick<
ConfigItemDefinition,
'summary' | 'description' | 'typeDescription' | 'externalDocs' | 'ui' |
'required' | 'sensitive' | 'expose' | 'useAt' | 'dynamic'
>;





/** shape of how we will serialize our errors when sending over the wire */
export type SerializedDmnoError = {
  icon: string,
  type: string, // TODO: maybe narrow this down?
  name: string,
  message: string,
  isUnexpected: boolean,
  cleanedStack?: Array<string>,
};
