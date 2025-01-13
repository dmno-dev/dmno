import { expect, test, describe } from 'vitest';
import {
  Configraph, createConfigraphDataType, inject, collect, switchBy,
  ConfigraphBaseTypes,
} from '@dmno/configraph';

const NonInjectableType = createConfigraphDataType({ injectable: false });

const InjectableType = createConfigraphDataType({});
const InjectableType2 = createConfigraphDataType({});

const ParentType = createConfigraphDataType({});
const ChildType = createConfigraphDataType({ extends: ParentType });


describe('type based value/dependency injection', async () => {
  describe('inject() - inject value from ancestors', () => {
    test('injects a value', async () => {
      const g = new Configraph();
      g.addEntity({
        configSchema: { injectSrc: { extends: InjectableType, value: 'injected-val' } },
      });
      const e = g.addEntity({
        configSchema: { injectDest: { extends: InjectableType, value: inject() } },
      });
      await g.resolveConfig();
      expect(e.configNodes.injectDest.resolvedValue).toEqual('injected-val');
    });

    test('injects an object value', async () => {
      const ObjectType = createConfigraphDataType({
        extends: ConfigraphBaseTypes.object({
          c1: { extends: 'string' },
          c2: { extends: 'number' },
        }),
      });

      const g = new Configraph();
      g.addEntity({
        configSchema: {
          injectSrc: {
            extends: ObjectType,
            value: { c1: 'c1-val', c2: 123 },
          },
        },
      });
      const e = g.addEntity({
        configSchema: { injectDest: { extends: ObjectType, value: inject() } },
      });
      await g.resolveConfig();
      expect(e.configNodes.injectDest.resolvedValue).toEqual({ c1: 'c1-val', c2: 123 });
    });

    test('works over multiple levels of ancestry', async () => {
      const g = new Configraph();
      g.addEntity({
        id: 'a',
        configSchema: {
          a1: { extends: InjectableType, value: 'a1' },
          a2: { extends: InjectableType2, value: 'a2' },
        },
      });
      g.addEntity({
        id: 'b',
        parentId: 'a',
        configSchema: {
        // no value for `InjectableType` so injection will continue updwards
          b2: { extends: InjectableType2, value: 'b2' },
        },
      });
      const e = g.addEntity({
        id: 'c',
        parentId: 'b',
        configSchema: {
          c1: { extends: InjectableType, value: inject() },
          c2: { extends: InjectableType2, value: inject() },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.c1.resolvedValue).toEqual('a1');
      expect(e.configNodes.c2.resolvedValue).toEqual('b2');
    });

    test('fails if multiple matches found in same entity', async () => {
      const g = new Configraph();
      g.addEntity({
        configSchema: {
          a1: { extends: InjectableType },
          a2: { extends: InjectableType },
        },
      });
      const e = g.addEntity({
        configSchema: {
          injectFail: { extends: InjectableType, value: inject() },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.injectFail.isSchemaValid).toBe(false);
    });

    test('`injectable: false` types will not be injected', async () => {
      const g = new Configraph();
      g.addEntity({
        configSchema: {
          provideFail: { extends: NonInjectableType },
          provideOk: { extends: InjectableType },
        },
      });
      const e = g.addEntity({
        configSchema: {
          injectFail: { extends: NonInjectableType, value: inject() },
          injectOk: { extends: InjectableType, value: inject() },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.injectFail.isSchemaValid).toBe(false);
      expect(e.configNodes.injectOk.isSchemaValid).toBe(true);
    });
    test('inject fails if no matching node is found', async () => {
      const g = new Configraph();
      g.addEntity({
        configSchema: {
          str: { value: 'stringval' },
        },
      });
      const e = g.addEntity({
        configSchema: {
          injectFail: { extends: InjectableType, value: inject() },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.injectFail.isSchemaValid).toBe(false);
    });

    test('child type can be injected as parent type', async () => {
      const g = new Configraph();
      g.addEntity({
        configSchema: {
          provideChild: { extends: ChildType },
        },
      });
      const e = g.addEntity({
        configSchema: {
          injectParent: { extends: ParentType, value: inject() },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.injectParent.isSchemaValid).toBe(true);
    });

    test('but parent type cannot be injected as child type', async () => {
      const g = new Configraph();
      g.addEntity({
        configSchema: {
          provideParent: { extends: ParentType },
        },
      });
      const e = g.addEntity({
        configSchema: {
          injectChild: { extends: ChildType, value: inject() },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.injectChild.isSchemaValid).toBe(false);
    });

    test('works properly within branched resolvers', async () => {
      const g = new Configraph();
      g.addEntity({
        configSchema: {
          provided: { extends: InjectableType, value: 'injected-val' },
        },
      });
      const e = g.addEntity({
        configSchema: {
          env: { value: 'production' },
          injected: {
            extends: InjectableType,
            value: switchBy('env', {
              _default: 'default-val',
              production: inject(),
            }),
          },
          injectFail: {
          // type is implicitly string, which is not injectable
            value: switchBy('env', {
              _default: inject(),
            }),
          },
        },
      });

      await g.resolveConfig();
      expect(e.configNodes.injected.isSchemaValid).toBe(true);
      expect(e.configNodes.injected.resolvedValue).toEqual('injected-val');
      expect(e.configNodes.injectFail.isSchemaValid).toBe(false);
    });
  });
  describe('collect() - inject value(s) from descendants', async () => {
    test('injects a value', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: { collectDest: { extends: InjectableType, value: collect() } },
      });
      g.addEntity({
        configSchema: { collectSrc: { extends: InjectableType, value: 'collected-val' } },
      });
      await g.resolveConfig();
      expect(e.configNodes.collectDest.resolvedValue).toEqual('collected-val');
    });

    test('works over multiple levels of ancestry', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        id: 'a',
        configSchema: {
          a1: { extends: InjectableType, value: collect() },
          a2: { extends: InjectableType2, value: collect() },
        },
      });
      g.addEntity({
        id: 'b',
        parentId: 'a',
        configSchema: {
        // no value for `InjectableType` so injection will continue downwards
          b2: { extends: InjectableType2, value: 'b2' },
        },
      });
      g.addEntity({
        id: 'c',
        parentId: 'b',
        configSchema: {
          c1: { extends: InjectableType, value: 'c1' },
          c2: { extends: InjectableType2, value: 'c2' },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.a1.resolvedValue).toEqual('c1');
      expect(e.configNodes.a2.resolvedValue).toEqual('b2');
    });

    test('fails if multiple matches found in same entity', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: {
          collectFail: { extends: InjectableType, value: collect() },
        },
      });
      g.addEntity({
        configSchema: {
          a1: { extends: InjectableType },
          a2: { extends: InjectableType },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.collectFail.isSchemaValid).toBe(false);
    });

    test('`injectable: false` types will not be injected', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: {
          collectFail: { extends: NonInjectableType, value: collect() },
        },
      });
      g.addEntity({
        configSchema: {
          provideFail: { extends: NonInjectableType },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.collectFail.isSchemaValid).toBe(false);
    });

    test('inject fails if no matching node is found', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: {
          collectFail: { extends: InjectableType, value: collect() },
        },
      });
      g.addEntity({
        configSchema: {
          str: { value: 'stringval' },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.collectFail.isSchemaValid).toBe(false);
    });

    test('child type can be injected as parent type', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: {
          injectParent: { extends: ParentType, value: collect() },
        },
      });
      g.addEntity({
        configSchema: {
          provideChild: { extends: ChildType },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.injectParent.isSchemaValid).toBe(true);
    });

    test('but parent type cannot be injected as child type', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: {
          injectChild: { extends: ChildType, value: collect() },
        },
      });
      g.addEntity({
        configSchema: {
          provideParent: { extends: ParentType },
        },
      });
      await g.resolveConfig();
      expect(e.configNodes.injectChild.isSchemaValid).toBe(false);
    });

    test('works properly within branched resolvers', async () => {
      const g = new Configraph();
      const e = g.addEntity({
        configSchema: {
          env: { value: 'production' },
          injected: {
            extends: InjectableType,
            value: switchBy('env', {
              _default: 'default-val',
              production: collect(),
            }),
          },
          injectFail: {
          // type is implicitly string, which is not injectable
            value: switchBy('env', {
              _default: collect(),
            }),
          },
        },
      });
      g.addEntity({
        configSchema: {
          provided: { extends: InjectableType, value: 'injected-val' },
        },
      });

      await g.resolveConfig();
      expect(e.configNodes.injected.isSchemaValid).toBe(true);
      expect(e.configNodes.injected.resolvedValue).toEqual('injected-val');
      expect(e.configNodes.injectFail.isSchemaValid).toBe(false);
    });
  });
});
