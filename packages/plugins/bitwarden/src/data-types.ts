import { DmnoBaseTypes, createDmnoDataType } from 'dmno';
import { BITWARDEN_ICON } from './constants';



const BitwardenMachineIdentityAccessToken = createDmnoDataType({
  typeLabel: 'bitwarden-sm/machine-account-access-token',
  // TODO: add a validation, but the rules and not published
  extends: DmnoBaseTypes.string(),
  typeDescription: 'Access token for a machine identity in Bitwarden Secrets Manager',
  externalDocs: {
    description: 'Bitwarden docs - access tokens',
    url: 'https://bitwarden.com/help/access-tokens/',
  },
  ui: {
    icon: BITWARDEN_ICON,
  },
  sensitive: true,
  includeInDmnoConfig: false,
});

const BitwardenSecretId = createDmnoDataType({
  typeLabel: 'bitwarden-sm/secret-id',
  extends: DmnoBaseTypes.uuid(),
  typeDescription: 'Unique ID that identifies a secret in Bitwarden Secrets Manager',
  externalDocs: {
    description: 'Bitwarden docs - secrets',
    url: 'https://bitwarden.com/help/secrets/',
  },
  ui: {
    icon: BITWARDEN_ICON,
  },
  includeInDmnoConfig: false,
});

const BitwardenProjectId = createDmnoDataType({
  typeLabel: 'bitwarden-sm/project-id',
  extends: DmnoBaseTypes.uuid(),
  typeDescription: 'Unique ID that identifies a project in Bitwarden Secrets Manager',
  externalDocs: {
    description: 'Bitwarden docs - projects',
    url: 'https://bitwarden.com/help/projects/',
  },
  ui: {
    icon: BITWARDEN_ICON,
  },
  includeInDmnoConfig: false,
});


export const BitwardenSecretsManagerTypes = {
  machineAccountAccessToken: BitwardenMachineIdentityAccessToken,
  secretId: BitwardenSecretId,
  projectId: BitwardenProjectId,
};
