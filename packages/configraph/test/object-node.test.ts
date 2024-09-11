import { expect, test, describe } from 'vitest';
import _ from 'lodash-es';
import {
  Configraph, inject, collect, switchBy,
  ConfigraphBaseTypes, createConfigraphDataType,
} from '@dmno/configraph';

const DataTypeWithDefaultValue = createConfigraphDataType({
  value: 'val-from-data-type',
});

describe('object config nodes', async () => {
  describe('undefined vs empty object behaviour', async () => {
    _.each({
      'empty object value is invalid': {
        value: {},
        valid: false,
      },
      'empty object value is valid with `allowEmpty` option': {
        value: {},
        valid: true,
        additionalSettings: { allowEmpty: true },
      },
      'undefined is valid (if not required)': {
        valid: true,
        expectedValue: undefined,
      },
      'undefined is not valid if required': {
        required: true,
        valid: false,
      },
      'undefined is also valid with `allowEmpty` option': {
        valid: true,
        additionalSettings: { allowEmpty: true },
      },
    }, (spec, description) => {
      test(description, async () => {
        const g = new Configraph();
        const e = g.createEntity({
          configSchema: {
            obj: {
              extends: ConfigraphBaseTypes.object(
                {},
                'additionalSettings' in spec ? spec.additionalSettings : undefined,
              ),
              ...'required' in spec && { required: spec.required },
              ...'value' in spec && { value: spec.value },
            },
          },
        });
        await g.resolveConfig();
        expect(e.configNodes.obj.isValid).toBe(spec.valid);
        if ('expectedValue' in spec) {
          expect(e.configNodes.obj.resolvedValue).toStrictEqual(spec.expectedValue);
        }
      });
    });
  });

  test('resolves object child values with correct precedence', async () => {
    const g = new Configraph();
    const e = g.createEntity({
      configSchema: {
        obj: {
          extends: ConfigraphBaseTypes.object({
            c1: { extends: DataTypeWithDefaultValue },
            c2: { extends: DataTypeWithDefaultValue, value: 'val-from-object-schema' },
            c3: { extends: DataTypeWithDefaultValue, value: 'val-from-object-schema' },
            c4: { extends: DataTypeWithDefaultValue, value: 'val-from-object-schema' },
          }),
          value: {
            c3: 'val-from-object-value',
            c4: 'val-from-object-value',
          },
        },
      },
      overrides: {
        'obj.c4': 'val-from-overrides',
      },
    });
    await g.resolveConfig();

    expect(e.getConfigNodeByPath('obj.c1').resolvedValue).toEqual('val-from-data-type');
    expect(e.getConfigNodeByPath('obj.c2').resolvedValue).toEqual('val-from-object-schema');
    expect(e.getConfigNodeByPath('obj.c3').resolvedValue).toEqual('val-from-object-value');
    expect(e.getConfigNodeByPath('obj.c4').resolvedValue).toEqual('val-from-overrides');

    // child values all roll back up into parent object
    expect(e.getConfigNodeByPath('obj').resolvedValue).toEqual({
      c1: 'val-from-data-type',
      c2: 'val-from-object-schema',
      c3: 'val-from-object-value',
      c4: 'val-from-overrides',
    });
  });

  test('nested object fns', async () => {
    const g = new Configraph();
    const e = g.createEntity({
      configSchema: {
        obj: {
          extends: ConfigraphBaseTypes.object({
            foo: {},
            bar: { value: (ctx) => ctx.get('rootBar') },
            fn: {
              value: (ctx) => ctx.get('obj.foo') + ctx.get('obj.bar'),
            },
          }),
          value: (ctx) => {
            return {
              foo: ctx.get('rootFoo'),
            };
          },
        },
        rootFoo: { value: 'foo' },
        rootBar: { value: 'bar' },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.obj.resolvedValue).toStrictEqual({
      foo: 'foo',
      bar: 'bar',
      fn: 'foobar',
    });
  });

  describe('nested validation', () => {
    test('parent node is invalid if any children are invalid', async () => {
      const g = new Configraph();
      const e = g.createEntity({
        configSchema: {
          obj: {
            extends: ConfigraphBaseTypes.object({
              c: { extends: ConfigraphBaseTypes.number({ min: 1 }), value: 0 },
            }),
          },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.obj.resolvedValue).toStrictEqual({ c: 0 });
      expect(e.configNodes.obj.isValid).toBe(false);
    });
    test('children are invalid if parent cannot resolve', async () => {
      const g = new Configraph();
      const e = g.createEntity({
        configSchema: {
          obj: {
            extends: ConfigraphBaseTypes.object({
              c: {},
            }),
            value: () => { throw new Error('nope'); },
          },
        },
      });
      await g.resolveConfig();
      expect(e.getConfigNodeByPath('obj.c').resolutionError).toBeTruthy();
      expect(e.configNodes.obj.isValid).toBe(false);
    });
  });

  describe('nested required behaviour', () => {
    _.each({
      'parent required + required child populated = valid': {
        required: true,
        value: { requiredChild: 'x' },
        valid: true,
      },
      'parent required + empty object = invalid': {
        // the value being an empty object rather than undefined
        // means we respect the required child's error
        required: true,
        value: {},
        valid: false,
      },
      'parent required + undefined value = invalid': {
        // wherease when the value is totally empty, we ignore the child errors
        required: true,
        valid: false,
      },
      'parent not required, required child populated = valid': {
        value: { requiredChild: 'x' },
        valid: true,
      },
      'parent not required, undefined = valid': {
        valid: true,
      },
      'parent not required, empty object = invalid': {
        value: {},
        valid: false,
      },
      'parent not required, object has optional child set = invalid': {
        value: { optionalChild: 'x' },
        valid: false,
      },
    }, (spec, description) => {
      test(description, async () => {
        const g = new Configraph();
        const e = g.createEntity({
          configSchema: {
            obj: {
              extends: ConfigraphBaseTypes.object(
                {
                  optionalChild: {},
                  requiredChild: { required: true },
                },
                { allowEmpty: true },
              ),
              ...'required' in spec && { required: spec.required },
              ...'value' in spec && { value: spec.value },
            },
          },
        });
        await g.resolveConfig();
        expect(e.configNodes.obj.isValid).toBe(spec.valid);
      });
    });
  });
});
