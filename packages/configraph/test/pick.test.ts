import { setTimeout as delay } from 'node:timers/promises';
import { expect, test, describe } from 'vitest';
import {
  Configraph, ConfigraphBaseTypes, createConfigraphEntityTemplate, pick, switchBy,
} from '@dmno/configraph';

describe('pick behaviour', async () => {
  test('picks from root and same path if nothing is specified', async () => {
    const g = new Configraph();
    g.addEntity({ id: 'root', configSchema: { pickMe: { value: 'root-val' } } });
    g.addEntity({ id: 'sibling', configSchema: { pickMe: { value: 'sibling-val' } } });
    const e = g.addEntity({
      configSchema: { pickMe: { extends: pick() } },
    });
    await g.resolveConfig();
    expect(e.configNodes.pickMe.resolvedValue).toEqual('root-val');
  });

  test('can specify an entity id and path to pick from', async () => {
    const g = new Configraph();
    g.addEntity({ id: 'root', configSchema: { pickMe: { value: 'root-val' } } });
    g.addEntity({ id: 'sibling', configSchema: { pickMe: { value: 'sibling-val' } } });

    // string-style, path defaults to same
    const e1 = g.addEntity({
      configSchema: {
        pickMe: { extends: pick('sibling') },
      },
    });
    // object-style, path defaults to same
    const e2 = g.addEntity({
      configSchema: {
        pickMe: { extends: pick({ entityId: 'sibling' }) },
      },
    });
    // key and object style, specifying both entity and path
    const e3 = g.addEntity({
      configSchema: {
        pickWithStrings: { extends: pick('sibling', 'pickMe') },
        pickWithObject: { extends: pick({ entityId: 'sibling', path: 'pickMe' }) },
      },
    });
    // object style path only, entity defaults to root
    const e4 = g.addEntity({
      configSchema: {
        pickFromRoot: { extends: pick({ path: 'pickMe' }) },
      },
    });

    await g.resolveConfig();
    expect(e1.configNodes.pickMe.resolvedValue).toEqual('sibling-val');
    expect(e2.configNodes.pickMe.resolvedValue).toEqual('sibling-val');
    expect(e3.configNodes.pickWithStrings.resolvedValue).toEqual('sibling-val');
    expect(e3.configNodes.pickWithObject.resolvedValue).toEqual('sibling-val');
    expect(e4.configNodes.pickFromRoot.resolvedValue).toEqual('root-val');
  });

  test('pick() can be used with shorthand instead of `extends`', async () => {
    const g = new Configraph();
    g.addEntity({ configSchema: { pickMe: { value: 'root-val' } } });
    const e = g.addEntity({
      configSchema: { pickMe: pick() },
    });
    await g.resolveConfig();
    expect(e.configNodes.pickMe.resolvedValue).toEqual('root-val');
  });

  test('can override properties of a picked node', async () => {
    const g = new Configraph();
    g.addEntity({
      configSchema: {
        pickMe: { value: 'root-val', description: 'original' },
      },
    });
    const e = g.addEntity({
      configSchema: {
        pickMe: {
          extends: pick(),
          coerce: (val) => `${val}-updated`,
          description: 'updated',
        },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.pickMe.resolvedValue).toEqual('root-val-updated');
    expect(e.configNodes.pickMe.type.description).toEqual('updated');
  });

  test('out of order picks are allowed', async () => {
    const g = new Configraph();
    const root = g.addEntity({}); // root
    const b = g.addEntity({ id: 'b', configSchema: { pickMe: pick('a') } });
    const a = g.addEntity({ id: 'a', configSchema: { pickMe: { value: 'a-val' } } });
    await g.resolveConfig();
    expect(root.isSchemaValid).toBe(true);
    expect(b.isSchemaValid).toBe(true);
    expect(a.isSchemaValid).toBe(true);
    expect(b.configNodes.pickMe.resolvedValue).toEqual('a-val');
  });

  test('can pick within an object', async () => {
    const g = new Configraph();
    const root = g.addEntity({
      id: 'root',
      configSchema: {
        a: { value: 'root-a-val' },
        b: { value: 'root-b-val' },
        obj: {
          extends: ConfigraphBaseTypes.object({
            a: { value: 'root-obj-a-val' },
            b: { value: 'root-obj-b-val' },
          }),
        },
      },
    });
    const e = g.addEntity({
      configSchema: {
        obj: {
          extends: ConfigraphBaseTypes.object({
            a: pick(), // should default to same full path: `obj.a`
            b: pick('root', 'b'),
          }),
        },
      },
    });
    await g.resolveConfig();
    expect(e.getConfigNodeByPath('obj.a').resolvedValue).toBe('root-obj-a-val');

    expect(e.getConfigNodeByPath('obj.a').isSchemaValid).toBe(true);
    expect(e.getConfigNodeByPath('obj.b').resolvedValue).toBe('root-b-val');
    expect(root.isSchemaValid).toBe(true);
  });

  test('entity pick cycles are allowed, as long as the nodes dont create a cycle', async () => {
    const g = new Configraph();
    const root = g.addEntity({}); // root
    const a = g.addEntity({
      id: 'a',
      configSchema: { na: { value: 'a' }, nc: pick('c') },
    });
    const b = g.addEntity({
      id: 'b',
      configSchema: { nb: { value: 'b' }, na: pick('a') },
    });
    const c = g.addEntity({
      id: 'c',
      configSchema: { nc: { value: 'c' }, nb: pick('b') },
    });
    g.processConfig();
    expect(root.isSchemaValid).toBe(true);
    expect(a.isSchemaValid).toBe(true);
    expect(b.isSchemaValid).toBe(true);
    expect(c.isSchemaValid).toBe(true);
  });


  describe('value resolution', () => {
    test('resolves to picked value from original, not just re-uses definition', async () => {
      const g = new Configraph();
      g.addEntity({
        id: 'root',
        configSchema: {
          pickMe: { value: (ctx) => `resolved-in-${ctx.entityId}` },
          other: { value: 'root' },
          pickMe2: { value: (ctx) => `other = ${ctx.get('other')}` },
        },
      });
      const e = g.addEntity({
        id: 'child',
        configSchema: {
          pickMe: pick(),
          other: { value: 'child' },
          pickMe2: pick(),
        },
      });
      await g.resolveConfig();
      // if it just reused the value resolver, we would see "resolved-in-child"
      expect(e.configNodes.pickMe.resolvedValue).toEqual('resolved-in-root');
      // if it just reused the value resolver, we would see "other = child"
      expect(e.configNodes.pickMe2.resolvedValue).toEqual('other = root');
    });

    test('picked items will wait for source to resolve', async () => {
      const g = new Configraph();
      g.addEntity({
        configSchema: {
          delayedSource: {
            value: async () => {
              await delay(1);
              return 'resolved-after-delay';
            },
          },
        },
      });
      const e = g.addEntity({ configSchema: { delayedSource: pick() } });
      await g.resolveConfig();
      expect(e.configNodes.delayedSource.resolutionError).toBeUndefined();
      expect(e.configNodes.delayedSource.resolvedValue).toEqual('resolved-after-delay');
    });
  });

  describe('multiple chained picks', () => {
    test('can pick multiple times', async () => {
      const g = new Configraph();
      g.addEntity({
        id: 'a',
        configSchema: { na: { value: 'a-val', description: 'original' } },
      });
      g.addEntity({
        id: 'b',
        parentId: 'a',
        configSchema: { na: { extends: pick('a'), description: 'updated' } },
      });
      const e = g.addEntity({
        id: 'c',
        parentId: 'b',
        configSchema: { na: pick('b') },
      });
      await g.resolveConfig();
      expect(e.configNodes.na.resolvedValue).toEqual('a-val');
      expect(e.configNodes.na.type.description).toEqual('updated');
    });
  });

  // TODO: value transformation - but now it should be more generic rather than pick specific

  describe('pick-related SchemaErrors', () => {
    test('node cannot pick itself', async () => {
      const g = new Configraph();
      const e = g.addEntity({ id: 'root', configSchema: { badPick: pick('root', 'badPick') } });
      g.processConfig();
      expect(e.configNodes.badPick.isSchemaValid).toBe(false);
    });
    test('node cannot pick itself - shorthand', async () => {
      const g = new Configraph();
      const e = g.addEntity({ configSchema: { badPick: pick() } });
      g.processConfig();
      expect(e.configNodes.badPick.isSchemaValid).toBe(false);
    });
    test('picking from an invalid entity', async () => {
      const g = new Configraph();
      g.addEntity({});
      const e = g.addEntity({ configSchema: { badPick: pick('bad-entity-id') } });
      g.processConfig();
      expect(e.configNodes.badPick.isSchemaValid).toBe(false);
    });
    test('picking an invalid key', async () => {
      const g = new Configraph();
      g.addEntity({ id: 'root' });
      const e = g.addEntity({ configSchema: { badPick: pick('root', 'does-not-exist') } });
      g.processConfig();
      expect(e.configNodes.badPick.isSchemaValid).toBe(false);
    });
    test('picking an invalid key - shorthand', async () => {
      const g = new Configraph();
      g.addEntity({});
      const e = g.addEntity({ configSchema: { badPick: pick() } });
      g.processConfig();
      expect(e.configNodes.badPick.isSchemaValid).toBe(false);
    });
    test('node pick cycle - direct', async () => {
      const g = new Configraph();
      const root = g.addEntity({}); // root
      const a = g.addEntity({
        id: 'a',
        configSchema: {
          na: { extends: pick('b', 'nb') },
        },
      });
      const b = g.addEntity({
        id: 'b',
        configSchema: {
          nb: { extends: pick('a', 'na') },
        },
      });

      g.processConfig();
      expect(a.configNodes.na.isSchemaValid).toBe(false);
      expect(b.configNodes.nb.isSchemaValid).toBe(false);
    });

    test('node pick cycle - indirect', async () => {
      const g = new Configraph();
      const root = g.addEntity({}); // root
      const a = g.addEntity({
        id: 'a',
        configSchema: {
          na: { extends: pick('b', 'nb') },
        },
      });
      const b = g.addEntity({
        id: 'b',
        configSchema: {
          nb: { extends: pick('c', 'nc') },
        },
      });
      const c = g.addEntity({
        id: 'c',
        configSchema: {
          nc: { extends: pick('a', 'na') },
        },
      });

      g.processConfig();
      expect(a.configNodes.na.isSchemaValid).toBe(false);
      expect(b.configNodes.nb.isSchemaValid).toBe(false);
      expect(c.configNodes.nc.isSchemaValid).toBe(false);
    });

    test('node pick cycle - indirect w/ non-picked node', async () => {
      const g = new Configraph();
      const root = g.addEntity({}); // root
      const a = g.addEntity({
        id: 'a',
        configSchema: {
          na: { extends: pick('b', 'nb') },
          // switchBy understands the dependency at schema time
          nfn: { value: switchBy('na', { _default: 'fn-result' }) },

        },
      });
      const b = g.addEntity({
        id: 'b',
        configSchema: {
          nb: { extends: pick('a', 'nfn') },
        },
      });
      // note we get an error after processing config, (pre-resolution)
      g.processConfig();
      expect(a.configNodes.na.isSchemaValid).toBe(false);
      expect(a.configNodes.nfn.isSchemaValid).toBe(false);
      expect(b.configNodes.nb.isSchemaValid).toBe(false);
    });

    test('node pick cycle - indirect w/ non-picked node at resolution time', async () => {
      const g = new Configraph();
      const root = g.addEntity({}); // root
      const a = g.addEntity({
        id: 'a',
        configSchema: {
          na: { extends: pick('b', 'nb') },
          // switchBy understands the dependency at schema time
          nfn: { value: (ctx) => ctx.get('na') },

        },
      });
      const b = g.addEntity({
        id: 'b',
        configSchema: {
          nb: { extends: pick('a', 'nfn') },
        },
      });

      g.processConfig();
      await g.resolveConfig();
      [a.configNodes.na, a.configNodes.nfn, b.configNodes.nb].forEach((node) => {
        // TODO: probably want to update the error to mention that we are in a cycle
        // currently the errors say "tried to use node that is not ready yet" because these get retried
        expect(node.isSchemaValid).toBe(true);
        expect(node.resolutionError).not.toBeUndefined();
      });
    });
  });

  describe('pick within templates', () => {
    test('cannot pick from template root', () => {
      const template = createConfigraphEntityTemplate({}, (t) => {
        t.addEntity({
          id: 'templateRoot',
          configSchema: {
            badPick: pick('root', 'rootNode'),
          },
        });
      });
      const g = new Configraph();
      const r = g.addEntity({
        id: 'root',
        configSchema: {
          rootNode: {},
        },
      });
      const e = g.addEntity({
        extends: template,
        configSchema: {},
      });
      g.processConfig();
      expect(e.configNodes.badPick.isSchemaValid).toBe(false);
    });


    test('can pick within a template', async () => {
      const template = createConfigraphEntityTemplate({}, (t) => {
        t.addEntity({
          id: 'templateRoot',
          configSchema: {
            pickFromTemplateRoot: { value: 'from-template-root' },
          },
        });
        t.addEntity({
          id: 'templateChildA',
          configSchema: {
            // should default to picking from the template root, not graph root
            pickFromTemplateRoot: pick(),
            pickFromTemplateSibling: { value: 'from-template-sibling' },
          },
        });
        t.addEntity({
          id: 'templateChildB',
          configSchema: {
            pickFromTemplateSibling: pick('templateChildA'),
          },
        });
      });

      const g = new Configraph();
      const root = g.addEntity({
        id: 'root',
        configSchema: {
          pickMe: { value: 'not-within-template' },
        },
      });
      g.addEntity({
        id: 't',
        extends: template,
        configSchema: {
          // should default to picking from graph root
          pickMe: pick(),
        },
      });
      await g.resolveConfig();
      expect(g.getNode('t*templateRoot', 'pickMe').resolvedValue).toEqual('not-within-template');
      expect(g.getNode('t*templateChildA', 'pickFromTemplateRoot').resolvedValue).toEqual('from-template-root');
      expect(g.getNode('t*templateChildB', 'pickFromTemplateSibling').resolvedValue).toEqual('from-template-sibling');
    });
  });
});
