// TODO: this file will be auto-generated... just showing an example of what we need to output

import { EncryptedVaultDmnoPlugin } from '../../src/plugin';
import { _PluginInputTypesSymbol } from '@dmno/core';
declare module '../../src/plugin' {
  interface EncryptedVaultDmnoPlugin {
    [_PluginInputTypesSymbol]: {
      /** encryption/decryption key */
      key: string,

      /** vault file name - defaults to "default" if empty */
      name?: string,
    }
  }
}
