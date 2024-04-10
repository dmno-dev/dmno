import { DmnoBaseTypes, ValidationError, createDmnoDataType } from '@dmno/core';

const ONEPASS_ICON = 'simple-icons:1password';

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
    icon: ONEPASS_ICON,
  },
  sensitive: true,
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
    icon: ONEPASS_ICON,
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
    icon: ONEPASS_ICON,
  },
});

const OnePasswordSecretReference = createDmnoDataType({
  typeLabel: '1pass/secret-reference',
  // we could add more validation...
  extends: DmnoBaseTypes.string({
    startsWith: 'op://',
    matches: /[a-z0-9-_./]+/,
  }),
  exampleValue: 'op://prod secrets/backend env vars/api',
  typeDescription: 'reference that identifies a specific secret within a 1password item - note that it is based on labels so not very stable',
  externalDocs: {
    description: '1password secret reference docs',
    url: 'https://developer.1password.com/docs/cli/secrets-reference-syntax',
  },
  ui: {
    icon: ONEPASS_ICON,
  },
});

// ex: https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=n4wmgfq77mydg5lebtroa3ykvm&h=dmnoinc.1password.com
const OnePasswordItemLink = createDmnoDataType({
  typeLabel: '1pass/item-link',
  extends: DmnoBaseTypes.url({
    // TODO: add more validation
  }),
  exampleValue: 'https://start.1password.com/open/i?a=ACCOUNTUUID&v=VAULTUUID&i=ITEMUUID&h=yourorg.1password.com',
  validate: (val) => {
    if (!val.startsWith('https://start.1password.com/open/i?')) {
      throw new ValidationError('1pass item url must start with "https://start.1password.com/open/i?"');
    }
    // currently we only really need the vault and item ids, so we're only checking for that
    // but we could check for the full URL... we'll see how this gets used
    const url = new URL(val);
    if (!url.searchParams.get('v') || !url.searchParams.get('i')) {
      throw new ValidationError('1pass item url is not complete - it must have item and vault ids"');
    }
  },
  typeDescription: 'url which opens to a specific item in 1password',
  externalDocs: {
    description: '1password private links',
    url: 'https://support.1password.com/item-links/',
  },
  ui: {
    icon: ONEPASS_ICON,
  },
});

export const OnePasswordTypes = {
  serviceAccountToken: OnePasswordServiceAccountToken,
  // vaultId: OnePasswordVaultId,
  // vaultName: OnePasswordVaultName,
  reference: OnePasswordSecretReference,
  itemLink: OnePasswordItemLink,
};
