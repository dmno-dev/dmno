import { DmnoBaseTypes, defineWorkspaceConfig, configPath, toggleByEnv, dmnoFormula } from '@dmno/core';
import { OnePasswordSecretService } from '@dmno/1password-plugin';

const OnePassBackend = new OnePasswordSecretService(
  configPath('ONE_PASSWORD.SERVICE_ACCOUNT_TOKEN'),
);

export default defineWorkspaceConfig({
  schema: {
    ONE_PASSWORD: {
      extends: DmnoBaseTypes.object({
        SERVICE_ACCOUNT_TOKEN: {
          description: 'token used to access a 1password service account',
          extends: DmnoBaseTypes.string({}),
          required: true,
        },
        VAULT_ID: {
          description: 'ID of the vault we store our secrets in',
          extends: DmnoBaseTypes.string({}),
        },
      }),
      required: true,
    },

    SEGMENT_SECRET: {
      extends: DmnoBaseTypes.string,
      value: toggleByEnv({
        _default: 'asdfasdfasdf',
        staging: OnePassBackend.itemByReference("op://dev test/segment/staging"),
        production: OnePassBackend.itemByReference("op://dev test/segment/prod")
      })
    },

    DB_NAME: {
      // value: (ctx) => {
      //   return `dmno_${ctx.get('NODE_ENV')}`
      // } 
      value: dmnoFormula('dmno_{{NODE_ENV}}'),
      required: (ctx) => {
        return ctx.get('NODE_ENV') === 'production';
      }
    }

    // NODE_ENV: {
    //   description: 'basic env flag - represents the "class" of environment',
    //   // docsExtended: 'some 3rd party tools toggle behaviour based on these values, so best not to deviate from the norm',
    //   value: development',
    //   overrides: {
    //     produciton: {
    //       syncFrom: OnePassProvider.getItem('as;ldkfjnkmlawef;okjasdf'),
    //     }
    //   }
    // },
    // DMNO_ENV: {
    //   description: 'more specific env type',
    //   validate: {
    //     oneOf: ['local', 'staging', 'ci', 'production'],
    //   },
    //   default: 'local',
    // },
    // LOGGING_TAGS: {
    //   description: 'tag to be used in logs',
    //   set: (ctx) => [ctx.DMNO_ENV],
    // },
    // ROOT_THINGY: {
    //   secret: true,
    //   validate: {
    //     startsWith: 'pk_',
    //   }
    // },

    // THINGY: {
    //   val: DmnoSyncSecret('onepass', '')
    // }


    // secretProviders: {
    //   onepass: OnePassBackend,
    // },

  }
});

