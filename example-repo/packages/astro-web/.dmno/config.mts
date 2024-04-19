import { DmnoBaseTypes, DmnoDataType, DmnoDataTypeFactoryFn, ExtractSettingsSchema, cacheFunctionResult, createDmnoDataType, defineConfigSchema, dmnoFormula, switchByDmnoEnv, switchByNodeEnv, } from '@dmno/core';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const OnePassBackend = OnePasswordDmnoPlugin.injectInstance('1pass');

export default defineConfigSchema({
  name: 'astroweb',
  parent: 'group1',
  pick: [
    'NODE_ENV',
    'DMNO_ENV',
    {
      source: 'api',
      key: 'API_URL',
    },
  ],
  schema: {
    FOO: {
      value: 'foo-config-value',
      description: 'test of non-sensitive env var WITHOUT "PUBLIC_" prefix',
    },
    PUBLIC_FOO: {
      value: 'public-foo-config-value',
      description: 'test of non-sensitive env var WITH "PUBLIC_" prefix',
    },
    SECRET_FOO: {
      value: 'secret-foo-config-value',
      sensitive: true,
      description: 'test of a sensitive env var',
    },
    EMPTY: {
      description: 'empty item, should be undefined, but not throw',
    },
    FN_FOO: {
      value: (ctx) => DMNO_CONFIG.FOO,
    }
  },
})
