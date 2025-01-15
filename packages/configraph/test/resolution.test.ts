import { expect, test, describe } from 'vitest';
import {
  Configraph, ConfigraphBaseTypes, createResolver, ResolutionError, getResolverCtx,
} from '@dmno/configraph';

const testResolver = (opts?: {
  fail?: boolean | 'unexpected',
  resolveToValue?: any,
}) => createResolver({
  label: 'test-resolver',
  resolve() {
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
  test('resolver failures always result in a ResolutionError', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        resolutionErr: { value: testResolver({ fail: true }) },
        unexpectedErr: { value: testResolver({ fail: 'unexpected' }) },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.resolutionErr.resolutionError).toBeInstanceOf(ResolutionError);
    expect(e.configNodes.unexpectedErr.resolutionError).toBeInstanceOf(ResolutionError);
  });

  test('resolver does not run if an override is present', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        resolutionErr: { value: testResolver({ fail: true }) },
      },
    });
    await g.processConfig();
    e.configNodes.resolutionErr.overrides.push({ sourceType: 'manual', value: 'override-value' });
    await g.resolveConfig();
    expect(e.configNodes.resolutionErr.resolutionError).toBeUndefined();
    expect(e.configNodes.resolutionErr.resolvedValue).toBe('override-value');
  });

  test('functions can reference other nodes, and dont need to be defined in the correct order', async () => {
    const g = new Configraph();
    const e = g.addEntity({
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

  test('resolver functions can use `getResolverCtx` instead of a `ctx` param', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        a: { value: 1 },
        b: {
          extends: 'number',
          value: () => 2 + getResolverCtx().get('a'),
        },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.b.resolvedValue).toEqual(3);
  });
  test('referencing non-existant nodes results in a resolution error, but repects `allowMissing` option', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        invalidFn: { value: (ctx) => ctx.get('does-not-exist') },
        validFn: { value: (ctx) => ctx.get('does-not-exist', { allowMissing: true }) },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.invalidFn.resolutionError).toBeInstanceOf(ResolutionError);
    expect(e.configNodes.validFn.resolutionError).toBeUndefined();
  });

  test('referencing invalid nodes results in a resolution error', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      configSchema: {
        invalid: { extends: ConfigraphBaseTypes.string({ startsWith: 'a' }), value: 'foo' },
        valid: { value: 'bar' },
        fn: { value: (ctx) => ctx.get('invalid') + ctx.get('valid') },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.fn.resolutionError).toBeInstanceOf(ResolutionError);
  });
});
