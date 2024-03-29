import { ConfigPath, InjectPluginInputByType } from '@dmno/core';
import { OnePasswordDmnoPlugin } from '../../src/plugin';
import { _PluginInputTypes } from '@dmno/core';

declare module '../../src/plugin' {
  interface OnePasswordDmnoPlugin {
    [_PluginInputTypes]: {
      /** token to be used... more jsdoc info... */
      token: string,
    
      defaultVaultId?: string,
      defaultVaultName?: string,
    }
  }


  namespace OnePasswordDmnoPlugin {
    // let newStatic: number;

    // const INPUT_TYPES: {
    //   /** token to be used... more jsdoc info... */
    //   token: string,

    //   defaultVaultId?: string,
    //   defaultVaultName?: string,
    // }

  }
}
