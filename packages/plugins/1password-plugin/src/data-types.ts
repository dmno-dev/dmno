import { DmnoBaseTypes, createDmnoDataType } from '@dmno/core';

export const OnePasswordServiceAccountToken = createDmnoDataType({
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

export const OnePasswordVaultId = createDmnoDataType({
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

export const OnePasswordVaultName = createDmnoDataType({
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
