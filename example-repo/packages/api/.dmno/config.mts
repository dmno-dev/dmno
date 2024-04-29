import { defineDmnoService, DmnoBaseTypes, NodeEnvType, configPath, dmnoFormula, switchByNodeEnv, createDmnoDataType } from 'dmno';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';
import { EncryptedVaultDmnoPlugin } from '@dmno/encrypted-vault-plugin';

const OnePassBackend = OnePasswordDmnoPlugin.injectInstance('1pass');
const VaultPlugin = EncryptedVaultDmnoPlugin.injectInstance('vault/prod');

export default defineDmnoService({
  name: 'api',
  parent: 'group1',
  pick: [
    'NODE_ENV',
    'DMNO_ENV',
  ],
  schema: {
    OP_ITEM_1: {
      value: OnePassBackend.item(),
    },

    SECRET_EXAMPLE: {
      extends: DmnoBaseTypes.string,
      required: true,
      value: OnePassBackend.itemByLink("https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&h=dmnoinc.1password.com&i=bphvvrqjegfmd5yoz4buw2aequ&v=ut2dftalm3ugmxc6klavms6tfq", 'username'),
    },
    SWITCHED_EXAMPLE: {
      value: switchByNodeEnv({
        _default: OnePassBackend.itemByReference("op://dev test/example/username"),
        staging: OnePassBackend.itemByReference("op://dev test/example/username"),
        production: OnePassBackend.itemByReference("op://dev test/example/username"),
      }),
    },

    API_ONLY: {
      value: 'set via dmno'
      // value: VaultPlugin.item(),
    },

    A_NEW_ITEM: {
      value: "phil 1"
    }, 
    PORT: {
      description: 'port number to listen on',
      extends: DmnoBaseTypes.number({ max: 9999 }),
      required: true,
      value: 9000,
    },
    API_URL: {
      description: 'public url of this service',
      extends: DmnoBaseTypes.string({}),
      expose: true,
      value: switchByNodeEnv({
        _default: (ctx) => `http://localhost:${DMNO_CONFIG.PORT}`,
        // staging: valueCreatedDuringDeployment(),
        production: 'https://api.dmnoexampleapp.com',
      })
    }
  },
});
