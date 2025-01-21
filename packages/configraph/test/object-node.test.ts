import { expect, test, describe } from 'vitest';
import * as _ from 'lodash-es';
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
        const e = g.addEntity({
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
    const e = g.addEntity({
      configSchema: {
        obj: {
          extends: ConfigraphBaseTypes.object({
            c1: { extends: DataTypeWithDefaultValue },
            c2: { extends: DataTypeWithDefaultValue, value: 'val-from-object-schema' },
            c3: { extends: DataTypeWithDefaultValue, value: 'val-from-object-schema' },
            c4: { extends: DataTypeWithDefaultValue, value: 'val-from-object-schema' },
            // c5: { extends: DataTypeWithDefaultValue, value: 'val-from-object-schema' },
          }),
          value: {
            c3: 'val-from-object-value',
            c4: 'val-from-object-value',
            // c5: 'val-from-object-value',
          },
        },
        // ! NEED TO SORT THROUGH THIS PRECEDENCE
        // 'obj.c5': { value: 'value-from-dot-path-override' },
      },
    });
    g.processConfig();
    // add additional override value
    e.getConfigNodeByPath('obj.c4').overrides.push({
      sourceType: 'unknown',
      value: 'val-from-overrides',
    });
    await g.resolveConfig();

    expect(e.getConfigNodeByPath('obj.c1').resolvedValue).toEqual('val-from-data-type');
    expect(e.getConfigNodeByPath('obj.c2').resolvedValue).toEqual('val-from-object-schema');
    expect(e.getConfigNodeByPath('obj.c3').resolvedValue).toEqual('val-from-object-value');
    expect(e.getConfigNodeByPath('obj.c4').resolvedValue).toEqual('val-from-overrides');
    // expect(e.getConfigNodeByPath('obj.c5').resolvedValue).toEqual('value-from-dot-path-override');

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
    const e = g.addEntity({
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
      const e = g.addEntity({
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
      const e = g.addEntity({
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
        const e = g.addEntity({
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

  describe('multiple nested objects', () => {
    test('nested objects must completely resolve', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: {
          rootObj: {
            extends: ConfigraphBaseTypes.object({
              r1: {},
              childObj: {
                extends: ConfigraphBaseTypes.object({
                  c1: { value: 'c1' },
                }),
              },
            }),
          },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.rootObj.resolvedValue).toEqual({ childObj: { c1: 'c1' } });
    });
  });

  describe('overriding nested node types', () => {
    test('can update a nested object node using a dot-path', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: {
          rootObj: {
            extends: ConfigraphBaseTypes.object({
              r1: { value: 'r1' },
              childObj: {
                extends: ConfigraphBaseTypes.object({
                  c1: { value: 'c1' },
                }),
              },
            }),
          },
          'rootObj.r1': { value: 'r1-updated' },
          'rootObj.childObj': { description: 'childObj description' },
          'rootObj.childObj.c1': { value: 'c1-updated' },
        },
      });
      await g.resolveConfig();
      expect(e.getConfigNodeByPath('rootObj.r1').resolvedValue).toEqual('r1-updated');
      expect(e.getConfigNodeByPath('rootObj.childObj').type.description).toEqual('childObj description');
      expect(e.getConfigNodeByPath('rootObj.childObj.c1').resolvedValue).toEqual('c1-updated');
      expect(e.configNodes.rootObj.resolvedValue).toEqual({
        r1: 'r1-updated',
        childObj: { c1: 'c1-updated' },
      });
    });
    test('can add a new child to an object using a dot-path', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: {
          rootObj: {
            extends: ConfigraphBaseTypes.object({
              r1: { value: 'r1' },
              childObj: {
                extends: ConfigraphBaseTypes.object({
                  c1: { value: 'c1' },
                }),
              },
            }),
          },
          'rootObj.r2': { value: 'r2' },
          'rootObj.childObj.c2': { value: 'c2' },
        },
      });
      await g.resolveConfig();
      expect(e.getConfigNodeByPath('rootObj.r2').resolvedValue).toEqual('r2');
      expect(e.getConfigNodeByPath('rootObj.childObj.c2').resolvedValue).toEqual('c2');
      expect(e.configNodes.rootObj.resolvedValue).toEqual({
        r1: 'r1',
        r2: 'r2',
        childObj: { c1: 'c1', c2: 'c2' },
      });
    });

    // TODO: check valid node paths - maybe not here?

    test('throws if parent object does not exist', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: {
          notAnObject: {},
          rootObj: {
            extends: ConfigraphBaseTypes.object({
              r1: { value: 'r1' },
              childObj: {
                extends: ConfigraphBaseTypes.object({
                  c1: { value: 'c1' },
                }),
              },
            }),
          },
          'notAnObject.newChild': {}, // not an object
          'badKey.newChild': {}, // bad key at root
          'rootObj.badKey.newChild': {}, // bad nested key
        },
      });
      await g.resolveConfig();
      expect(e.schemaErrors.length).toEqual(3);
    });
  });
});
