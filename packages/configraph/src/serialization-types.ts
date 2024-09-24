/*
  These types are used to define how our config is sent over the wire

  We make sure that our objects know how to serialize to these shapes and use them in our IPC requests
  to know what shapes to expect on both sides of the communication

  NOTE - by heavily using Pick<T>, we get to preserve the definition (including comments) from the actual classes
  and force us to use the same name internally and when we send over the wire
*/

import {
  ConfigraphDataTypeDefinition, ConfigValueResolver,
  ConfigraphPlugin,
  ConfigraphNode,
} from '@dmno/configraph';
import { ConfigValueOverride } from './config-node';
// import {
//   DmnoService, InjectedDmnoEnv,
// } from '../config-engine/config-engine';


export type SerializedGraph = {
  services: Record<string, SerializedConfigraphEntity>,
  plugins: Record<string, SerializedConfigraphPlugin>,
};

// export type SerializedConfigraphEntity<EntityMetadata = {}> =
export type SerializedConfigraphEntity =
  // Pick<ConfigraphEntity, 'packageName' | 'serviceName' | 'path' | 'settings'>
  // EntityMetadata
  {
    id: string,
    parentId?: string,
    isSchemaValid: boolean,
    isValid: boolean,
    isResolved: boolean,
    configLoadError?: SerializedConfigraphError,
    schemaErrors?: Array<SerializedConfigraphError>,
    ownedPluginNames: Array<string>,
    injectedPluginNames: Array<string>,
    // configNodes: Record<string, SerializedConfigraphNode>,
    // injectedEnv: InjectedDmnoEnv,
  };

export type SerializedConfigraphPlugin = Pick<
ConfigraphPlugin,
'pluginType' | 'instanceId' | 'isValid' | 'isSchemaValid' | 'parentEntityId'
> & {
  usedByConfigItemResolverPaths?: Array<string>,
  schemaErrors?: Array<SerializedConfigraphError>,
  inputNodes: Record<string, SerializedConfigraphNode>,
};

export type SerializedConfigraphNode =
  Pick<ConfigraphNode, 'key' | 'isValid' | 'isSchemaValid' | 'resolvedRawValue' | 'resolvedValue' | 'isResolved'>
  & {
    dataType: SerializedConfigraphDataType,
    children: Record<string, SerializedConfigraphNode>,
    coercionError?: SerializedConfigraphError,
    validationErrors?: Array<SerializedConfigraphError>,
    schemaErrors?: Array<SerializedConfigraphError>,
    // TODO: dedupe some items from the resolver
    resolutionError?: SerializedConfigraphError,
    resolver?: SerializedResolver,

    mappedToNodePath: string | undefined,
    overrides?: Array<ConfigValueOverride>,

    // dmno specific
    // isDynamic: boolean,
  };

export type SerializedResolver =
  Pick<ConfigValueResolver, 'isResolved'>
  & {
    icon?: string,
    label?: string,
    resolvedValue?: any,
    createdByPluginId?: string,
    branches?: Array<SerializedResolverBranch>,
    resolutionError?: SerializedConfigraphError,
    // itemPath?: string;
    // branchIdPath?: string;
  };
export type SerializedResolverBranch = {
  id: string,
  label: string,
  isDefault: boolean,
  isActive: boolean | undefined,
  resolver: SerializedResolver,
};

export type SerializedConfigraphDataType<NodeMetadata = {}> =
  (
    Pick<ConfigraphDataTypeDefinition<any, NodeMetadata>,
    'summary' | 'description' | 'typeDescription' | 'required' | 'expose' |
    'externalDocs' | 'ui'>
  ) &
  // dmno config specific metadata
  // 'sensitive' | 'useAt' | 'dynamic'
  NodeMetadata;


/** shape of how we will serialize our errors when sending over the wire */
export type SerializedConfigraphError = {
  icon: string,
  type: string, // TODO: maybe narrow this down?
  name: string,
  message: string,
  isUnexpected: boolean,
  cleanedStack?: Array<string>,
  tip?: string,
};



