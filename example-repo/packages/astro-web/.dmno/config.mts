import { DmnoBaseTypes, DmnoDataType, DmnoDataTypeFactoryFn, ExtractSettingsSchema, cacheFunctionResult, createDmnoDataType, defineDmnoService, dmnoFormula, switchByDmnoEnv, switchByNodeEnv, } from 'dmno';
import { OnePasswordDmnoPlugin, OnePasswordTypes } from '@dmno/1password-plugin';

const OnePassBackend = OnePasswordDmnoPlugin.injectInstance('1pass');

export default defineDmnoService({
  name: 'astroweb',
  parent: 'group1',
  settings: {
    dynamicConfig: 'default_static',
  },
  pick: [
    'NODE_ENV',
    'DMNO_ENV',
    {
      source: 'api',
      key: 'API_URL',
    },
  ],
  schema: {
    OP_TOKEN: { extends: OnePasswordTypes.serviceAccountToken },

    FOO: {
      extends: DmnoBaseTypes.string({ startsWith: 'abc_' }),
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
      value: (ctx) => `fn-prefix-${DMNO_CONFIG.FOO}`,
    },
    PUBLIC_DYNAMIC: {
      value: 'public-dynamic-init',
      dynamic: true,
    },
    PUBLIC_STATIC: {
      value: 'public-static-init',
    },

    SECRET_STATIC: {
      value: 'secret-static',
      dynamic: false,
      sensitive: true,
    },
    SECRET_DYNAMIC: {
      value: 'secret-dynamic',
      dynamic: true,
      sensitive: true,
    },
  },
})
