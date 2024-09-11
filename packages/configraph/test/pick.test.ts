import { expect, test, describe } from 'vitest';
import { Configraph } from '@dmno/configraph';

describe('pick behaviour', async () => {
  describe('node selection', () => {
    test('can pick from root using a key only (string)', async () => {
      const g = new Configraph();
      g.createEntity({ configSchema: { pickMe: { value: 'root-val' } } });
      g.createEntity({ configSchema: { pickMe: { value: 'sibling-val' } } });
      const e = g.createEntity({ pickSchema: ['pickMe'] });
      await g.resolveConfig();
      expect(e.configNodes.pickMe.resolvedValue).toEqual('root-val');
    });
    test('can pick from root using a key only (object)', async () => {
      const g = new Configraph();
      g.createEntity({ configSchema: { pickMe: { value: 'root-val' } } });
      g.createEntity({ configSchema: { pickMe: { value: 'sibling-val' } } });
      const e = g.createEntity({ pickSchema: [{ key: 'pickMe' }] });
      await g.resolveConfig();
      expect(e.configNodes.pickMe.resolvedValue).toEqual('root-val');
    });
    test('can pick using a source id', async () => {
      const g = new Configraph();
      g.createEntity({ configSchema: { pickMe: { value: 'root-val' } } });
      // if not picking from ancestor, picked nodes must be marked `expose: true`
      g.createEntity({ id: 'sibling', configSchema: { pickMe: { value: 'sibling-val', expose: true } } });
      const e = g.createEntity({ pickSchema: [{ entityId: 'sibling', key: 'pickMe' }] });
      await g.resolveConfig();
      expect(e.configNodes.pickMe.resolvedValue).toEqual('sibling-val');
    });
    test('can pick keys using a filter function', async () => {
      const g = new Configraph();
      g.createEntity({
        configSchema: { pickMe: {}, pickMeToo: {}, dontPickMe: {} },
      });
      const e = g.createEntity({ pickSchema: [{ key: (k) => k.startsWith('pick') }] });
      await g.resolveConfig();
      expect(Object.keys(e.configNodes)).toEqual(['pickMe', 'pickMeToo']);
    });
    test('can pick _all_ keys from ancestor with `key: true`', async () => {
      const g = new Configraph();
      g.createEntity({
        configSchema: { a: {}, b: {}, c: {} },
      });
      const e = g.createEntity({ pickSchema: [{ key: true }] });
      await g.resolveConfig();
      expect(Object.keys(e.configNodes)).toEqual(['a', 'b', 'c']);
    });
    test('can pick all _exposed_ keys from non-ancestor with `key: true`', async () => {
      const g = new Configraph();
      g.createEntity({ id: 'root' });
      g.createEntity({
        id: 'sibling',
        configSchema: { a: { expose: true }, b: {}, c: {} },
      });
      const e = g.createEntity({ pickSchema: [{ entityId: 'sibling', key: true }] });
      await g.resolveConfig();
      expect(Object.keys(e.configNodes)).toEqual(['a']);
    });
  });

  describe('multiple picks', () => {
    test('can pick multiple times', async () => {
      const g = new Configraph();
      g.createEntity({ id: 'e1', configSchema: { a: { value: 'a-val' } } });
      g.createEntity({ id: 'e2', parentId: 'e1', pickSchema: ['a'] });
      const e = g.createEntity({ id: 'e3', parentId: 'e2', pickSchema: [{ entityId: 'e2', key: 'a' }] });
      await g.resolveConfig();
      expect(e.configNodes.a.resolvedValue).toEqual('a-val');
    });
  });

  describe('key renaming', () => {
    test('can rename picked key with static value', async () => {
      const g = new Configraph();
      g.createEntity({ configSchema: { a: { value: 'a' } } });
      const e = g.createEntity({ pickSchema: [{ key: 'a', renameKey: 'renamed_a' }] });
      await g.resolveConfig();
      expect(e.configNodes.renamed_a.resolvedValue).toEqual('a');
    });
    test('can rename picked key with a function', async () => {
      const g = new Configraph();
      g.createEntity({ configSchema: { a: { value: 'a' } } });
      const e = g.createEntity({ pickSchema: [{ key: 'a', renameKey: (k) => `renamed_${k}` }] });
      await g.resolveConfig();
      expect(e.configNodes.renamed_a.resolvedValue).toEqual('a');
    });
  });

  describe('value transformation', () => {
    test('can transform a value', async () => {
      const g = new Configraph();
      g.createEntity({ configSchema: { a: { value: 1 }, b: { value: 5 } } });
      const e = g.createEntity({
        pickSchema: [{ key: true, transformValue: (v) => v + 1 }],
      });
      await g.resolveConfig();
      expect(e.configNodes.a.resolvedValue).toEqual(1 + 1);
      expect(e.configNodes.b.resolvedValue).toEqual(5 + 1);
    });
    test('can transform values through multiple picks', async () => {
      const g = new Configraph();
      g.createEntity({ id: 'e1', configSchema: { a: { value: 'a' } } });
      const child = g.createEntity({
        id: 'e2',
        parentId: 'e1', // implied...
        pickSchema: [{ key: 'a', transformValue: (v) => `${v}b` }],
      });
      const grandchild = g.createEntity({
        id: 'e3',
        parentId: 'e2',
        pickSchema: [{
          entityId: 'e2', key: 'a', transformValue: (v) => `${v}c`,
        }],
      });
      await g.resolveConfig();
      expect(grandchild.configNodes.a.resolvedValue).toEqual('abc');
    });
  });

  describe('pick-related SchemaErrors', () => {
    test('root entity cannot pick', async () => {
      const g = new Configraph();
      const root = g.createEntity({ pickSchema: ['nope'] });
      g.processConfig();
      expect(root.schemaErrors.length).toBe(1);
    });
    test('picking from an invalid entity id', async () => {
      const g = new Configraph();
      g.createEntity({});
      const e = g.createEntity({ configSchema: { }, pickSchema: [{ entityId: 'bad-entity-id', key: 'c' }] });
      g.processConfig();
      expect(e.schemaErrors.length).toBe(1);
    });
    test('picking an invalid key', async () => {
      const g = new Configraph();
      g.createEntity({});
      const e = g.createEntity({ configSchema: { }, pickSchema: ['bad-key'] });
      g.processConfig();
      expect(e.schemaErrors.length).toBe(1);
    });
    test('picking a non-exposed key from a sibling', async () => {
      const g = new Configraph();
      g.createEntity({});
      g.createEntity({ id: 'sibling', configSchema: { a: {} } });
      // a is not marked `expose: true` so results in an error
      const e = g.createEntity({ pickSchema: [{ entityId: 'sibling', key: 'a' }] });
      await g.resolveConfig();
      expect(e.schemaErrors.length).toBe(1);
    });
    test('pick key filter function with no matches', async () => {
      const g = new Configraph();
      g.createEntity({ configSchema: { a: {} } });
      const e = g.createEntity({ pickSchema: [{ key: (k) => k.startsWith('xxx') }] });
      await g.resolveConfig();
      expect(Object.keys(e.configNodes)).toEqual([]);
      expect(e.schemaErrors.length).toEqual(1);
    });
    test('pick cycle', async () => {
      const g = new Configraph();
      const root = g.createEntity({}); // root
      const a = g.createEntity({ id: 'a', configSchema: { a: {} }, pickSchema: [{ entityId: 'c', key: 'c' }] });
      const b = g.createEntity({ id: 'b', configSchema: { b: {} }, pickSchema: [{ entityId: 'a', key: 'a' }] });
      const c = g.createEntity({ id: 'c', configSchema: { c: {} }, pickSchema: [{ entityId: 'b', key: 'b' }] });
      const d = g.createEntity({ id: 'd', configSchema: {}, pickSchema: [{ entityId: 'a', key: 'a' }] });
      g.processConfig();
      expect(root.isSchemaValid).toBe(true);
      expect(d.isSchemaValid).toBe(true);
      [a, b, c].forEach((entity) => {
        expect(entity.isSchemaValid).toBe(false);
        expect(entity.schemaErrors.length).toBe(1);
        expect(entity.schemaErrors[0].message).toContain('cycle');
      });
    });
  });
});
