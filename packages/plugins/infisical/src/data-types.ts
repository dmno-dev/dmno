import { DmnoBaseTypes, createDmnoDataType } from 'dmno';
import { INFISICAL_ICON } from './constants';



const InfisicalClientId = createDmnoDataType({
  typeLabel: 'infisical/client-id',
  // TODO: add a validation, but the rules and not published
  extends: DmnoBaseTypes.string(),
  typeDescription: 'Client ID for an Infisical client',
  externalDocs: {
    description: 'Infisical docs - client ID',
    url: 'https://infisical.com/docs/documentation/platform/identities/universal-auth',
  },
  ui: {
    icon: INFISICAL_ICON,
  },
  sensitive: true,
});

const InfisicalClientSecret = createDmnoDataType({
  typeLabel: 'infisical/client-secret',
  extends: DmnoBaseTypes.string(),
  typeDescription: 'Client secret for an Infisical client',
  externalDocs: {
    description: 'Infisical docs - client secret',
    url: 'https://infisical.com/docs/documentation/platform/identities/universal-auth',
  },
  ui: {
    icon: INFISICAL_ICON,
  },
});

const InfisicalEnvironment = createDmnoDataType({
  typeLabel: 'infisical/environment',
  extends: DmnoBaseTypes.string(),
  typeDescription: 'Unique ID that identifies an environment in Infisical',
  externalDocs: {
    description: 'Infisical docs - environments',
    url: 'https://infisical.com/docs/documentation/platform/environments',
  },
  ui: {
    icon: INFISICAL_ICON,
  },
});

const InfisicalProjectId = createDmnoDataType({
  typeLabel: 'infisical/project-id',
  extends: DmnoBaseTypes.uuid(),
  typeDescription: 'Unique ID that identifies a project in Infisical',
  externalDocs: {
    description: 'Infisical docs - projects',
    url: 'https://infisical.com/docs/documentation/platform/projects',
  },
  ui: {
    icon: INFISICAL_ICON,
  },
});


export const InfisicalTypes = {
  clientId: InfisicalClientId,
  clientSecret: InfisicalClientSecret,
  environment: InfisicalEnvironment,
  projectId: InfisicalProjectId,
};
