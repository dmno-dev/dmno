
import { DmnoBaseTypes, defineDmnoService, configPath, NodeEnvType, switchBy, inject, ValidationError } from 'dmno';
import { OnePasswordDmnoPlugin, OnePasswordTypes } from '@dmno/1password-plugin';


const OnePassSecrets = OnePasswordDmnoPlugin.injectInstance('1pass');

// uncomment to show config loading error
// throw new Error('bloop');

export default defineDmnoService({
  // name: 'dmno-ui-demo',
  settings: {
    interceptSensitiveLeakRequests: true,
    redactSensitiveLogs: true,
    preventClientLeaks: true,
  },
  pick: [
    'NODE_ENV'
  ],
  schema: {
    NORMAL_NUMBER: {
      value: 123,
      required: true,
    },
    FN_RESOLVER: {
      extends: DmnoBaseTypes.number,
      summary: 'example of a function resolver',
      value: () => DMNO_CONFIG.NORMAL_NUMBER + 456,
    },
    SENSITIVE_EXAMPLE: {
      value: OnePassSecrets.itemByReference("op://dev test/example/username"),
      sensitive: true,
    },
    SENSITIVE_COERCED: {
      value: 'this\\nis\\nsensitive',
      coerce: (val) => val.replace('\\n', '\n'),
      sensitive: true,
    },
    EXTRA_SUPER_LONG_NAME_EXAMPLE_FOO_BAR_BIZ_BAZ_BUZ_BING_BONG_BOOP: {
      summary: 'example showing a super long name that should be truncated but still show the icons',
      value: 'asldkjfhqoiuweyrklajsdhnxbcvmnsdjkhfhqiwuerqolejfhzsjmnvbxjkhfsiudyfrwjkebfmnsdbfkjsdhfiukjwehrkjsdbnfkjbsdkjfbxcmnbvjksdhgfkjweiuryweijkhkjsdbfmnxdbcvkjsdhfjkiweyrkiujhsdjkf'
    },
    BRANCH_EXAMPLE: {
      value: switchBy('NODE_ENV', {
        _default: 'default-val',
        staging: 'staging-val',
        production: 'production-val',
      })
    },
    OBJECT_EXAMPLE: {
      extends: DmnoBaseTypes.object({
        child1: { value: 'child-1-val' },
        child2: { value: 'child-2-val' },
        objChild: {
          // required: true,
          extends: DmnoBaseTypes.object({
            gchild1: { value: 'grandchild!' },
            // gchild2: { value: 'another' },
          }),
        }
      })
    },

    // overrides
    FROM_DOTENV_OVERRIDE: {
      value: 'default',
    },
    FROM_SHELL_OVERRIDE: {
      value: 'default',
    },

    // errors
    REQUIRED_ERROR_EXAMPLE: {
      required: true,
      // value: 'ok'
    },
    VALIDATION_ERROR_EXAMPLE: {
      extends: DmnoBaseTypes.string({ startsWith: 'abc', minLength: 8 }),
      value: 'xyz123',
    },
    COERCION_ERROR_EXAMPLE: {
      extends: DmnoBaseTypes.number(),
      value: 'not-a-number',
    },
    SCHEMA_ERROR_EXAMPLE: {
      // value: configPath('bad-entity-id', 'bad-path'),
    },
    RESOLUTION_ERROR_EXAMPLE: {
      value: OnePassSecrets.itemByReference('badreference'),
    },
    WARNING_EXAMPLE: {
      value: 'foo',
      validate(val) {
        throw new ValidationError('this is a warning', { isWarning: true });
      }
    },
    // RESOLVER_CRASH_EXAMPLE: {
    //   value: OnePassSecrets.itemByLink('badlink', 'asdf'),
    // }
  }
});

