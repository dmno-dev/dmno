import { DmnoBaseTypes, DmnoDataType, DmnoDataTypeFactoryFn, ExtractSettingsSchema, cacheFunctionResult, createDmnoDataType, defineDmnoService, dmnoFormula, switchByDmnoEnv, switchByNodeEnv, } from 'dmno';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const OnePassBackend = OnePasswordDmnoPlugin.injectInstance('1pass');

export default defineDmnoService({
  name: 'nextweb',
  parent: 'group1',
  pick: [
    'NODE_ENV',
    'DMNO_ENV',
    {
      source: 'api',
      key: 'API_URL',
      renameKey: 'NEXT_PUBLIC_API_URL',
    },
    {
      source: 'group1',
      // picking the renamed key from group1
      key: 'PICK_TEST_G1',
      renameKey: 'PICK_TEST_NW',
      // should apply _after_ the group1 transform
      transformValue: (val) => `${val}-nextwebtransform`,
    }
  ],
  schema: {
    FOO: {
      value: 'foo',
      description: 'test of a public env var without a NEXT_PUBLIC_ prefix',
    },
    SECRET_FOO: {
      value: 'secret-foo',
      sensitive: true,
      description: 'test of a sensitive env var',
    },

    EMPTY: {
      description: 'empty item, should be undefined',
    },

    
    PUBLIC_STATIC: {
      value: 'public-static-default',
    },
    PUBLIC_DYNAMIC: {
      value: 'public-dynamic-default',
      dynamic: true,
    },

    PUBLIC_DYNAMIC2: {
      value: 'public-dynamic-default another!',
      dynamic: true,
    },


    SECRET_STATIC: {
      value: 'secret-static-default',
      sensitive: true,
      required: true,
    },
    SECRET_DYNAMIC: {
      value: 'secret-dynamic-default',
      dynamic: true,
      sensitive: true,
      required: true,
    },
    

    
    NEXT_PUBLIC_STATIC: {
      value: (ctx) => DMNO_CONFIG.PUBLIC_STATIC,
    },


  },
})
