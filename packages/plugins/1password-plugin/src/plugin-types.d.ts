// example of how we could augment the plugin to add the input schema
// from within a file within the src folder

import { OnePasswordDmnoPlugin } from './plugin';

declare module './plugin' {
  interface OnePasswordDmnoPlugin {
    INPUTS: {
      /** token to be used... more jsdoc info... */
      token: string,

      defaultVaultId?: string,
      defaultVaultName?: string,
    }
  }
}
