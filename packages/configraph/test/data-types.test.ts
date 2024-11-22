import { expect, test, describe } from 'vitest';
import _ from 'lodash-es';
import {
  ConfigraphBaseTypes, ConfigraphDataType, createConfigraphDataType, ConfigraphDataTypesRegistry,
  ValidationError,
} from '@dmno/configraph';


function runValidationChecks(
  t: ConfigraphDataType,
  cases: Record<string, { val: any, fail?: boolean }>,
) {
  _.each(cases, (testCase) => {
    try {
      // to pass a validation can return true, undefined
      // to fail it can return an error, array of errors, or throw
      const result = t.validate(testCase.val);
      if (result !== true && result !== undefined) throw result as any;
    } catch (err) {
      if (!testCase.fail) {
        throw new Error('expected validation to pass');
      }
    }
  });
}

describe('data types', () => {
  test('`required` should be inferred if static value set and not specified', () => {
    const t1 = createConfigraphDataType({ value: 'asdf' })();
    expect(t1.required).to.eq(true);

    const t2 = createConfigraphDataType({ value: 123 })();
    expect(t2.required).to.eq(true);

    const t3 = createConfigraphDataType({ value: 'asdf', required: false })();
    expect(t3.required).to.eq(false);

    const t4 = createConfigraphDataType({ required: true })();
    expect(t4.required).to.eq(true);

    const t5 = createConfigraphDataType({ value: undefined })();
    expect(t5.required).not.to.eq(true); // currently its undefined, we could make it false instead?

    const t6 = createConfigraphDataType({})();
    expect(t6.required).not.to.eq(true);
  });

  test('validation using settings works', () => {
    const StringStartCheck = createConfigraphDataType({
      extends: ConfigraphBaseTypes.string({
        startsWith: 'abc',
      }),
    });

    // just a simple check that settings are passed through correctly to validations
    runValidationChecks(StringStartCheck(), {
      'prefix only should succeed': { val: 'abc' },
      'prefix with more text should succeed': { val: 'abcdefg' },
      'other string should fail': { val: 'asdf', fail: true },
    });
  });

  test('check reusing settings in extends', () => {
    const val = 'THEO@DMNO.DEV';
    // TODO: can make this more clear
    // internally the email type uses the string type's toLowerCase option
    const t = ConfigraphBaseTypes.email({ normalize: true });
    expect(t.coerce(val)).toBe(val.toLowerCase());

    const t2 = ConfigraphBaseTypes.email({ normalize: false });
    expect(t2.coerce(val)).toBe(val);
  });

  describe('additional metadata', () => {
    type ExtraNodeMetadata = {
      extra1?: boolean,
      extra2?: boolean,
    };
    class CustomTypesRegistry extends ConfigraphDataTypesRegistry<ExtraNodeMetadata> {}
    const customTypesRegistry = new CustomTypesRegistry();
    const createCustomDataType = customTypesRegistry.create;

    test('additional metadata inheritance', () => {
    // metadata properties will follow up the type chain the same as regular properties
      const TypeA = createCustomDataType({});
      const TypeB = createCustomDataType({ extends: TypeA, extra1: true });
      const TypeC = createCustomDataType({ extends: TypeB });
      const TypeD = createCustomDataType({ extends: TypeC, extra1: false });

      expect(TypeA().getMetadata('extra1')).not.toBe(true);
      expect(TypeB().getMetadata('extra1')).toBe(true);
      expect(TypeC().getMetadata('extra1')).toBe(true);
      expect(TypeD().getMetadata('extra1')).not.toBe(true);
    });
  });

  // TODO: check validation call flow works (how it follows up the chain)
});


// some checks of validations on specific types
// TODO: ideally these test cases can be moved to the types themselves, and we provide utils to run them
function testType(t: ConfigraphDataType, validCases: Record<string, any>, invalidCases: Record<string, any>) {
  for (const testCase in validCases) {
    const value = validCases[testCase];
    test(`${value} - valid`, () => {
      expect(t.validate(value)).toEqual(true);
    });
  }
  for (const testCase in invalidCases) {
    const value = invalidCases[testCase];
    test(`${value} - NOT valid`, () => {
      const isValid = t.validate(value) as Array<any>;
      expect(isValid).not.toEqual(true);
      expect(isValid).length.above(0);
      expect(isValid[0]).toBeInstanceOf(ValidationError);
    });
  }
}

describe('specific data type tests', () => {
  describe('url', () => {
    testType(ConfigraphBaseTypes.url(), {
      'regular url': 'https://example.com/123',
      'localhost url': 'http://localhost:1234/123',
      'username only': 'https://username@example.com/123',
      'username and password': 'https://user:pass@example.com/123',
      'bad tld, but still valid': 'http://asdf', // TODO: not sure about this - maybe add options?
    }, {
      'bad string': 'asdf',
      'domain only': 'asdf.com',
    });
  });
});
