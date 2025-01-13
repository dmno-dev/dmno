import { expect, test, describe } from 'vitest';
import { Configraph } from '@dmno/configraph';

describe('graph entities and dependency ordering', () => {
  describe('entity parents', () => {
    test('basic root and parent logic', async () => {
      const g = new Configraph();
      expect(g._rootEntityId).toBeUndefined();
      const root = g.addEntity({ id: 'root' });
      // parent is defaulted to root if none set
      const child = g.addEntity({ id: 'child' });
      const grandchild = g.addEntity({ id: 'grandchild', parentId: 'child' });
      expect(g._rootEntityId).toEqual('root');
      expect(root.parentId).toBeUndefined();
      expect(root.isRoot).toBe(true);
      expect(child.parentId).toEqual('root');
      expect(grandchild.parentId).toEqual('child');
      expect(grandchild.ancestorIds).toEqual(['root', 'child']);
    });
    test('root cannot have a parentId set', async () => {
      const g = new Configraph();
      const r = g.addEntity({ parentId: 'a' });
      g.addEntity({ id: 'a' });
      g.processConfig();
      expect(r.isSchemaValid).toBe(false);
    });

    test('cannot set parent to self', async () => {
      const g = new Configraph();
      g.addEntity({ id: 'root' });
      const a = g.addEntity({ id: 'a', parentId: 'a' });
      g.processConfig();
      expect(a.isSchemaValid).toBe(false);
    });

    test('cannot set parentId to non-existant id', async () => {
      const g = new Configraph();
      g.addEntity({ id: 'root' });
      const a = g.addEntity({ id: 'a', parentId: 'bad-id' });
      g.processConfig();
      expect(a.isSchemaValid).toBe(false);
    });

    test('entities must be created in order', async () => {
      const g = new Configraph();
      g.addEntity({ id: 'root' });
      const a = g.addEntity({ id: 'a', parentId: 'b' });
      g.addEntity({ id: 'b' });
      g.processConfig();
      expect(a.isSchemaValid).toBe(false);
    });
  });

  test('can create entities without specifying ids', async () => {
    const g = new Configraph();
    const r = g.addEntity({});
    g.addEntity({});
    expect(g._rootEntityId).toEqual(r.id);
  });

  test('entity ids must be unique', async () => {
    expect(() => {
      const g = new Configraph();
      g.addEntity({ id: 'dupe' });
      g.addEntity({ id: 'dupe' });
      // probably should change this into a schema error rather than throwing?
    }).toThrowError();
  });
});
