import { expect, test, describe } from 'vitest';
import * as _ from 'lodash-es';
import {
  Configraph, inject, collect, switchBy,
  ConfigraphBaseTypes, createConfigraphDataType,
} from '@dmno/configraph';

const DataTypeWithDefaultValue = createConfigraphDataType({
  value: 'val-from-data-type',
});

describe('array data type + nodes', async () => {
  describe('undefined vs empty array behaviour', async () => {
    _.each({
      'empty array value is invalid': {
        value: [],
        valid: false,
      },
      'empty array value is valid with `allowEmpty` option': {
        value: [],
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
            arr: {
              extends: ConfigraphBaseTypes.array({}, {
                ...('additionalSettings' in spec ? spec.additionalSettings : undefined),
              }),
              ...'required' in spec && { required: spec.required },
              ...'value' in spec && { value: spec.value },
            },
          },
        });
        await g.resolveConfig();
        expect(e.configNodes.arr.isValid).toBe(spec.valid);
        if ('expectedValue' in spec) {
          expect(e.configNodes.arr.resolvedValue).toStrictEqual(spec.expectedValue);
        }
      });
    });
  });

  // TODO: more testing of the other options (although they are quite simple)

  test('coerces each array child', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        arr: {
          extends: ConfigraphBaseTypes.array({ extends: ConfigraphBaseTypes.number() }),
          value: ['1', '2', '3'],
        },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.arr.resolvedValue).toEqual([1, 2, 3]);
  });

  test('validates each array child', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        arr: {
          extends: ConfigraphBaseTypes.array('number'),
          value: ['1', 'asdf', 3],
        },
      },
    });
    await g.resolveConfig();
    expect(e.getConfigNodeByPath('arr.0').isValid).toBe(true);
    expect(e.getConfigNodeByPath('arr.1').isValid).toBe(false);
    expect(e.getConfigNodeByPath('arr.2').isValid).toBe(true);
    // invalid child should roll up to parent
    expect(e.getConfigNodeByPath('arr').isValid).toBe(false);
  });

  test('resolves array child values with correct precedence', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        arr: {
          extends: ConfigraphBaseTypes.array({
            extends: DataTypeWithDefaultValue,
            value: 'item-type-default',
          }),
          value: [undefined, 'array-parent-value'],
        },
        // ! NEED TO FIGURE THIS OUT (and for objects too)
        // 'arr.2': { value: 'dot-path-item-value' }
      },
    });
    g.processConfig();
    // TODO: cannot add override here yet - because the node does not exist yet
    // add additional override value
    // e.getConfigNodeByPath('arr.2').overrides.push({
    //   sourceType: 'unknown',
    //   value: 'val-from-overrides',
    // });
    await g.resolveConfig();

    expect(e.getConfigNodeByPath('arr.0').resolvedValue).toEqual('item-type-default');
    expect(e.getConfigNodeByPath('arr.1').resolvedValue).toEqual('array-parent-value');
    // expect(e.getConfigNodeByPath('arr.2').resolvedValue).toEqual('dot-path-item-value');


    // child values all roll back up into parent object
    expect(e.getConfigNodeByPath('arr').resolvedValue).toEqual([
      'item-type-default',
      'array-parent-value',
    ]);
  });
});
