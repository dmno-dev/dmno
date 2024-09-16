import { expect, test, describe } from 'vitest';
import _ from 'lodash-es';
import {
  Configraph,
  ConfigraphBaseTypes, ConfigraphDataType, createConfigraphDataType, ConfigraphDataTypesRegistry,
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
    // TODO: hopefully we can unify the extra metadata schema and type generic passed in
    class CustomTypesRegistry extends ConfigraphDataTypesRegistry<{
      extra1?: boolean,
      extra2?: boolean,
    }> {
      nodeMetadataSchema = {
        extra1: { serialize: true },
        extra2: { serialize: false },
      };
    }
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

    test('additional metadata serialization', () => {
      const g = new Configraph({
        defaultTypeRegistry: customTypesRegistry,
      });

      const CustomType = createCustomDataType({ extends: 'string' });
      const e = g.createEntity({
        configSchema: {
          noType: {},
          stringTypeShorthand: 'string',
          stringTypeExtends: { extends: 'string' },
          baseTypeFactory: { extends: ConfigraphBaseTypes.string },
          baseType: { extends: ConfigraphBaseTypes.string({}) },
          customType: { extends: CustomType },
        },
      });
      const serialized = e.toJSON();
      _.each(serialized.configNodes, (node, key) => {
        expect(node.dataType).toHaveProperty('extra1');
        expect(node.dataType).not.toHaveProperty('extra2');
      });
    });
  });

  // TODO: check validation call flow works (how it follows up the chain)
});
