import { expect, test, describe } from 'vitest';
import {
  Configraph, ConfigraphBaseTypes, createResolver, ResolutionError, switchBy,
} from '@dmno/configraph';

const testResolver = (opts?: {
  fail?: boolean | 'unexpected',
  resolveToValue?: any,
}) => createResolver({
  label: 'failed-resolver',
  resolve(ctx) {
    if (opts?.fail === 'unexpected') {
      throw new Error('unexpected error');
    } else if (opts?.fail === true) {
      throw new ResolutionError('Failed to resolve');
    } else if (opts?.resolveToValue) {
      return opts.resolveToValue;
    }
  },
});

describe('graph resolution', () => {
  test('functions can reference other nodes, and dont need to be defined in the correct order', async () => {
    const g = new Configraph();
    const e = g.createEntity({
      configSchema: {
        c: {
          extends: 'number',
          value: (ctx) => ctx.get('a') + ctx.get('b'),
        },
        a: { value: 2 },
        b: { value: 3 },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.c.isSchemaValid).toBe(true);
    expect(e.configNodes.c.resolvedValue).toEqual(5);
  });

  test('resolver failures always result in a ResolutionError', async () => {
    const g = new Configraph();
    const e = g.createEntity({
      configSchema: {
        resolutionError: { value: testResolver({ fail: true }) },
        unexpectedError: { value: testResolver({ fail: 'unexpected' }) },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.resolutionError.resolutionError).toBeInstanceOf(ResolutionError);
    expect(e.configNodes.unexpectedError.resolutionError).toBeInstanceOf(ResolutionError);
  });

  test('referencing non-existant nodes results in a resolution error', async () => {
    const g = new Configraph();
    const e = g.createEntity({
      configSchema: {
        fn: { value: (ctx) => ctx.get('does-not-exist') },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.fn.resolutionError).toBeInstanceOf(ResolutionError);
  });

  test('referencing invalid nodes results in a resolution error', async () => {
    const g = new Configraph();
    const e = g.createEntity({
      configSchema: {
        invalid: { extends: ConfigraphBaseTypes.string({ startsWith: 'a' }), value: 'foo' },
        valid: { value: 'bar' },
        fn: { value: (ctx) => ctx.get('invalid') + ctx.get('valid') },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.fn.resolutionError).toBeInstanceOf(ResolutionError);
  });

  describe('switchBy() resolver', () => {
    test('can switch resolver branches from on another node value', async () => {
      const g = new Configraph();
      const e = g.createEntity({
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
      const e = g.createEntity({
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

    test('item has a SchemaError if key/path is not valid', async () => {
      const g = new Configraph();
      const e = g.createEntity({
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
  });
});
