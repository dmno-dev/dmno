import { DmnoBaseTypes, createDmnoDataType } from 'dmno';

const DmnoEncryptionKey = createDmnoDataType({
  typeLabel: 'dmno/encryption-key',
  extends: DmnoBaseTypes.string({
    startsWith: 'dmno//',
  }),
  // TODO: more validation
  typeDescription: 'AES-256-GCM encryption key, used for encrypting secrets in dmno',
  externalDocs: {
    description: 'dmno docs',
    url: 'https://dmno.dev/docs/',
  },
  ui: {
    icon: 'material-symbols:key',
  },
  sensitive: true,
  includeInDmnoConfig: false,
});

export const EncryptedVaultTypes = {
  encryptionKey: DmnoEncryptionKey,
};
