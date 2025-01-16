import { expect, test, describe } from 'vitest';
import {
  Configraph, switchBy,
} from '@dmno/configraph';

describe('switchBy() resolver', () => {
  test('can switch resolver branches from on another node value', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        env: { value: 'staging' },
        switchTest: {
          value: switchBy('env', {
            _default: 'default-val',
            staging: 'staging-val',
            production: 'production-val',
          }),
        },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.switchTest.isSchemaValid).toBe(true);
    expect(e.configNodes.switchTest.resolvedValue).toBe('staging-val');
  });

  test('_default value is used if value not found', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        env: { value: 'other' },
        switchTest: {
          value: switchBy('env', {
            _default: 'default-val',
            staging: 'staging-val',
          }),
        },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.switchTest.resolvedValue).toBe('default-val');
  });

  test('works with non-string values', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        someBool: { value: true },
        switchTest: {
          value: switchBy('someBool', {
            true: 'true-val',
            false: 'false-val',
          }),
        },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.switchTest.resolvedValue).toBe('true-val');
  });

  test('item has a SchemaError if key/path is not valid', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        switchTest: {
          value: switchBy('does-not-exist', {
            _default: 'default-val',
          }),
        },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.switchTest.schemaErrors).toHaveLength(1);
  });

  test('we get a ResolutionError if no _default defined and no matching branch found', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        env: { value: 'other' },
        switchTest: {
          value: switchBy('env', {
            staging: 'staging-val',
          }),
        },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.switchTest.resolutionError).not.toBeUndefined();
  });
});
