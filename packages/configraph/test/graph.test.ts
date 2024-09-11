import { expect, test, describe } from 'vitest';
import { Configraph } from '@dmno/configraph';

describe('graph entities and dependency ordering', () => {
  describe('entity parents', () => {
    test('basic root and parent logic', async () => {
      const g = new Configraph();
      expect(g._rootEntityId).toBeUndefined();
      const root = g.createEntity({ id: 'root' });
      // parent is defaulted to root if none set
      const child = g.createEntity({ id: 'child' });
      const grandchild = g.createEntity({ id: 'grandchild', parentId: 'child' });
      expect(g._rootEntityId).toEqual('root');
      expect(root.parentId).toBeUndefined();
      expect(root.isRoot).toBe(true);
      expect(child.parentId).toEqual('root');
      expect(grandchild.parentId).toEqual('child');
      expect(grandchild.ancestorIds).toEqual(['root', 'child']);
    });
    test('root cannot have a parentId set', async () => {
      const g = new Configraph();
      const r = g.createEntity({ parentId: 'a' });
      g.createEntity({ id: 'a' });
      g.processConfig();
      expect(r.isSchemaValid).toBe(false);
    });

    test('cannot set parent to self', async () => {
      const g = new Configraph();
      g.createEntity({ id: 'root' });
      const a = g.createEntity({ id: 'a', parentId: 'a' });
      g.processConfig();
      expect(a.isSchemaValid).toBe(false);
    });

    test('cannot set parentId to non-existant id', async () => {
      const g = new Configraph();
      g.createEntity({ id: 'root' });
      const a = g.createEntity({ id: 'a', parentId: 'bad-id' });
      g.processConfig();
      expect(a.isSchemaValid).toBe(false);
    });

    test('entities must be created in order', async () => {
      const g = new Configraph();
      g.createEntity({ id: 'root' });
      const a = g.createEntity({ id: 'a', parentId: 'b' });
      g.createEntity({ id: 'b' });
      g.processConfig();
      expect(a.isSchemaValid).toBe(false);
    });
  });

  test('can create entities without specifying ids', async () => {
    const g = new Configraph();
    const r = g.createEntity({});
    g.createEntity({});
    expect(g._rootEntityId).toEqual(r.id);
  });

  test('entity ids must be unique', async () => {
    expect(() => {
      const g = new Configraph();
      g.createEntity({ id: 'dupe' });
      g.createEntity({ id: 'dupe' });
      // probably should change this into a schema error rather than throwing?
    }).toThrowError();
  });

  test('picking nodes affects dep order', async () => {
    const g = new Configraph();
    g.createEntity({ id: 'root' }); // will be parent of all
    g.createEntity({ id: 'a', configSchema: { a: {} } });
    g.createEntity({ id: 'c', configSchema: { c: {} }, pickSchema: [{ entityId: 'b', key: 'b' }] });
    g.createEntity({ id: 'b', configSchema: { b: {} }, pickSchema: [{ entityId: 'a', key: 'a' }] });
    g.processConfig();
    // root -> a -> b -> c
    expect(g.sortedEntityIds.indexOf('root')).toBeLessThan(g.sortedEntityIds.indexOf('a'));
    expect(g.sortedEntityIds.indexOf('a')).toBeLessThan(g.sortedEntityIds.indexOf('b'));
    expect(g.sortedEntityIds.indexOf('b')).toBeLessThan(g.sortedEntityIds.indexOf('c'));
  });
});
