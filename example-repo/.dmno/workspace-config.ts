import { defineWorkspaceConfig } from '@dmno/core';

const OnePassProvider = new OnePassDmnoProvider(config.resolve('1PASS_KEY'))

defineWorkspaceConfig({
  NODE_ENV: {
    description: 'basic env flag - represents the "class" of environment',
    docsExtended: 'some 3rd party tools toggle behaviour based on these values, so best not to deviate from the norm',
    validate: {
      oneOf: ['development', 'test', 'production'],
    },
    default: 'development',
    overrides: {
      produciton: {
        syncFrom: OnePassProvider.getItem('as;ldkfjnkmlawef;okjasdf'),
      }
    }
  },
  DMNO_ENV: {
    description: 'more specific env type',
    validate: {
      oneOf: ['local', 'staging', 'ci', 'production'],
    },
    default: 'local',
  },
  LOGGING_TAGS: {
    description: 'tag to be used in logs',
    set: (ctx) => [ctx.DMNO_ENV],
  },
  ROOT_THINGY: {
    secret: true,
    validate: {
      startsWith: 'pk_',
    }
  },

  AWS_REGION: {
    type: AwsRegion,
    default: 'us-east-2',
    requiredAt: 'deploy',
  },

  AWS_CREDS: 



}, {
  loadFileForEnvs: true
});

