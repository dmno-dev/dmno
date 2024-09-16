/*
  These types are used to define how our config is sent over the wire

  We make sure that our objects know how to serialize to these shapes and use them in our IPC requests
  to know what shapes to expect on both sides of the communication

  NOTE - by heavily using Pick<T>, we get to preserve the definition (including comments) from the actual classes
  and force us to use the same name internally and when we send over the wire
*/

import {
  ConfigraphDataTypeDefinition, ConfigValueResolver,
  ConfigraphPlugin, ConfigraphPluginInputItem,
  ConfigraphNodeBase,
  SerializedConfigraphEntity,
} from '@dmno/configraph';
import {
  DmnoService, InjectedDmnoEnv,
} from '../config-engine/config-engine';
import { DmnoDataTypeMetadata } from '../config-engine/configraph-adapter';


export type SerializedWorkspace = {
  services: Record<string, SerializedService>,
  plugins: Record<string, SerializedDmnoPlugin>,
};

export type SerializedService =
  Pick<DmnoService, 'packageName' | 'serviceName' | 'path' | 'settings'>
  & {
    //! injectedEnv: InjectedDmnoEnv,
    configLoadError?: SerializedDmnoError,
  } & SerializedConfigraphEntity;

//   isSchemaValid: boolean,
//   isValid: boolean,
//   isResolved: boolean,
//   schemaErrors?: Array<SerializedDmnoError>,
//   ownedPluginNames: Array<string>,
//   injectedPluginNames: Array<string>,
//   configNodes: Record<string, SerializedConfigItem>,

// };

export type SerializedDmnoPlugin = Pick<ConfigraphPlugin, 'pluginType' | 'instanceName' | 'isValid'>
& {
  cliPath?: string,
  initializedInService: string,
  injectedIntoServices: Array<string>,
  inputs: Record<string, SerializedDmnoPluginInput>,
  usedByConfigItemResolverPaths?: Array<string>,
};
export type SerializedDmnoPluginInput = Pick<ConfigraphPluginInputItem, 'key' | 'isValid' | 'resolvedValue' | 'isResolved' | 'resolutionMethod'> & {
  isValid: boolean,
  mappedToItemPath?: string,
  coercionError?: SerializedDmnoError,
  validationErrors?: Array<SerializedDmnoError>,
  schemaError?: SerializedDmnoError,
};

export type SerializedConfigItem =
  Pick<ConfigraphNodeBase, 'key' | 'isValid' | 'isSchemaValid' | 'resolvedRawValue' | 'resolvedValue' | 'isResolved'>
  & {
    dataType: SerializedDmnoDataType,
    children: Record<string, SerializedConfigItem>,
    coercionError?: SerializedDmnoError,
    validationErrors?: Array<SerializedDmnoError>,
    schemaErrors?: Array<SerializedDmnoError>,
    // TODO: dedupe some items from the resolver
    resolutionError?: SerializedDmnoError,
    resolver?: SerializedResolver,
    // overrides?: Array<ConfigValueOverride>,

    // dmno specific
    //! isDynamic: boolean,
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
ConfigraphDataTypeDefinition<any, DmnoDataTypeMetadata>,
'summary' | 'description' | 'typeDescription' | 'required' | 'expose' |
'externalDocs' | 'ui' |
// dmno config specific metadata
'sensitive' | 'useAt' | 'dynamic'
>;





/** shape of how we will serialize our errors when sending over the wire */
export type SerializedDmnoError = {
  icon: string,
  type: string, // TODO: maybe narrow this down?
  name: string,
  message: string,
  isUnexpected: boolean,
  cleanedStack?: Array<string>,
  tip?: string,
};
