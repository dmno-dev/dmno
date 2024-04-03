/*
  These types are used to define how our config is sent over the wire

  We make sure that our objects know how to serialize to these shapes and use them in our IPC requests
  to know what shapes to expect on both sides of the communication

  NOTE - by heavily using Pick<T>, we get to preserve the definition (including comments) from the actual classes
  and force us to use the same name internally and when we send over the wire
*/

import { DmnoConfigItemBase, DmnoService } from '../config-engine/config-engine';
import { DmnoPlugin, DmnoPluginInputItem } from '../config-engine/plugins';


export type SerializedWorkspace = {
  services: Array<SerializedService>
};

export type SerializedService =
  Pick<DmnoService, 'packageName' | 'serviceName' | 'path'>
  & {
    isValid: boolean,
    isResolved: boolean,
    configLoadError?: SerializedDmnoError,
    schemaErrors?: Array<SerializedDmnoError>,
    plugins: Array<SerializedDmnoPlugin>,
    config: Record<string, SerializedConfigItem>,
  };

export type SerializedDmnoPlugin = Pick<DmnoPlugin, 'pluginType' | 'instanceName' | 'isValid'>
& {
  cliPath?: string,
  initializedInService?: string,
  injectedIntoServices?: Array<string>,
  inputs: Record<string, SerializedDmnoPluginInput>,
};
export type SerializedDmnoPluginInput = Pick<DmnoPluginInputItem, 'key' | 'isValid' | 'resolvedRawValue' | 'resolvedValue' | 'isResolved'> & {
  isValid: boolean,
  coercionError?: SerializedDmnoError,
  validationErrors?: Array<SerializedDmnoError>,
  schemaError?: SerializedDmnoError,
};


export type SerializedConfigItem =
  Pick<DmnoConfigItemBase, 'key' | 'isValid' | 'resolvedRawValue' | 'resolvedValue' | 'isResolved'>
  & {
    children: Record<string, SerializedConfigItem>,
    coercionError?: SerializedDmnoError,
    validationErrors?: Array<SerializedDmnoError>,
    resolutionError?: SerializedDmnoError,
  };




/** shape of how we will serialize our errors when sending over the wire */
export type SerializedDmnoError = {
  icon: string,
  type: string, // TODO: maybe narrow this down?
  name: string,
  message: string,
  isUnexpected: boolean,
  cleanedStack?: Array<string>,
};
