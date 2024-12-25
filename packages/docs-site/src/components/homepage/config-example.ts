import {
  DmnoBaseTypes, defineDmnoService, switchBy, configPath,
} from 'dmno';
import { EncryptedVaultDmnoPlugin, EncryptedVaultTypes } from '@dmno/encrypted-vault-plugin';
import { OnePasswordDmnoPlugin, OnePasswordTypes } from '@dmno/1password-plugin';

// use a plugin to fetch secrets from a secure backend like 1Password
const onePassSecrets = new OnePasswordDmnoPlugin('1pass', { token: configPath('OP_TOKEN') });
// or store them encrypted within your repo
const vaultFileSecrets = new EncryptedVaultDmnoPlugin('vault', { key: configPath('DMNO_VAULT_KEY') });

export default defineDmnoService({
  // re-use items defined in other services
  pick: ['API_KEY', 'DB_URL', 'DMNO_ENV'],
  // more config specific to this service
  schema: {
    DMNO_VAULT_KEY: {
      // re-use existing types with validation and docs info built-in
      extends: EncryptedVaultTypes.encryptionKey,
    },
    OP_TOKEN: {
      extends: OnePasswordTypes.serviceAccountToken,
    },
    SAAS_API_KEY: {
      // load different values based on any other value
      value: switchBy('DMNO_ENV', {
        _default: 'my-dev-key',
        production: onePassSecrets.item(),
      }),
    },
    SAAS_PROJECT_TAG: {
      // use a function to set a value - reference any other config
      value: () => `myapp_${DMNO_CONFIG.DMNO_ENV}`,
    },
  },
});
