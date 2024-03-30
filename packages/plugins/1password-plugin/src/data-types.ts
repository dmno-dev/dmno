import { DmnoBaseTypes, createDmnoDataType } from '@dmno/core';

const OnePasswordServiceAccountToken = createDmnoDataType({
  typeLabel: '1pass/service-account-token',
  extends: DmnoBaseTypes.string({ startsWith: 'ops_' }),
  exampleValue: 'ops_a1B2c3...xyz',
  typeDescription: 'Service account token used to authenticate with the [1password CLI](https://developer.1password.com/docs/cli/get-started/)',
  externalDocs: {
    description: '1password service accounts',
    url: 'https://developer.1password.com/docs/service-accounts/',
  },
  ui: {
    icon: 'simple-icons:1password',
  },
  secret: true,
});

const OnePasswordVaultId = createDmnoDataType({
  typeLabel: '1pass/vault-id',
  extends: DmnoBaseTypes.string({ startsWith: 'ops_' }),
  typeDescription: 'unique ID that identifies a 1password "vault"',
  externalDocs: {
    description: '1password vault basics',
    url: 'https://support.1password.com/create-share-vaults/',
  },
  ui: {
    icon: 'simple-icons:1password',
  },
});

const OnePasswordVaultName = createDmnoDataType({
  typeLabel: '1pass/vault-name',
  extends: DmnoBaseTypes.string,
  typeDescription: 'name that identifies a vault - is not necessarily stable',
  externalDocs: {
    description: '1password vault basics',
    url: 'https://support.1password.com/create-share-vaults/',
  },
  ui: {
    icon: 'simple-icons:1password',
  },
});


export const OnePasswordTypes = {
  serviceAccountToken: OnePasswordServiceAccountToken,
  vaultId: OnePasswordVaultId,
  vaultName: OnePasswordVaultName,
};
