import { expect, test, describe } from 'vitest';
import * as _ from 'lodash-es';
import {
  Configraph, ConfigraphBaseTypes, createConfigraphEntityTemplate,
} from '@dmno/configraph';


describe('entity templates', () => {
  test('nodes are combined from the template and instance', async () => {
    const template = createConfigraphEntityTemplate({}, (t) => {
      t.addEntity({
        configSchema: {
          templateDefinedItem: { value: 'template-val' },
        },
      });
    });

    const g = new Configraph();
    const root = g.addEntity({
      id: 'root',
      extends: template,
      configSchema: {
        instanceDefinedItem: { value: 'instance-val' },
      },
    });

    await g.resolveConfig();
    expect(root.configNodes.templateDefinedItem.resolvedValue).toBe('template-val');
    expect(root.configNodes.instanceDefinedItem.resolvedValue).toBe('instance-val');
  });

  test('individual nodes are merged together', async () => {
    const template = createConfigraphEntityTemplate({}, (t) => {
      t.addEntity({
        configSchema: {
          nPlus10: { value: 1, coerce: (val) => val + 10 },
        },
      });
    });

    const g = new Configraph();
    const root = g.addEntity({
      id: 'root',
      extends: template,
      configSchema: {
        nPlus10: { value: 2 },
      },
    });

    await g.resolveConfig();
    // checking that we retained the coerce function, but changed the value
    expect(root.configNodes.nPlus10.resolvedValue).toBe(12);
  });

  test('multiple templates in a chain are merged together', async () => {
    const baseTemplate = createConfigraphEntityTemplate({}, (t) => {
      t.addEntity({
        configSchema: {
          a: { value: 'a-base-template', description: 'a-base-template' },
          b: { value: 'b-base-template', description: 'b-base-template' },
          c: { value: 'c-base-template', description: 'c-base-template' },
        },
      });
    });
    const childTemplate = createConfigraphEntityTemplate({}, (t) => {
      t.addEntity({
        extends: baseTemplate,
        configSchema: {
          a: { value: 'a-child-template', description: 'a-child-template' },
          b: { value: 'b-child-template', description: 'b-child-template' },
        },
      });
    });

    const g = new Configraph();
    const root = g.addEntity({
      id: 'root',
      extends: childTemplate,
      configSchema: {
        a: { value: 'a-instance', description: 'a-instance' },
      },
    });

    await g.resolveConfig();
    // checking that we retained the coerce function, but changed the value
    expect(root.configNodes.a.resolvedValue).toBe('a-instance');
    expect(root.configNodes.a.type.description).toBe('a-instance');
    expect(root.configNodes.b.resolvedValue).toBe('b-child-template');
    expect(root.configNodes.b.type.description).toBe('b-child-template');
    expect(root.configNodes.c.resolvedValue).toBe('c-base-template');
    expect(root.configNodes.c.type.description).toBe('c-base-template');
  });

  test('template root entity config nodes can be updated/added using dot paths', async () => {
    const template = createConfigraphEntityTemplate({}, (t) => {
      t.addEntity({
        configSchema: {
          obj: {
            extends: ConfigraphBaseTypes.object({
              c1: { value: 'c1' },
            }),
          },
        },
      });
    });

    const g = new Configraph();
    const e = g.addEntity({
      extends: template,
      configSchema: {
        'obj.c1': { value: 'c1-updated' },
        'obj.newChild': { value: 'new' },
      },
    });

    await g.resolveConfig();
    expect(e.getConfigNodeByPath('obj.c1').resolvedValue).toEqual('c1-updated');
    expect(e.getConfigNodeByPath('obj.newChild').resolvedValue).toEqual('new');
  });

  describe('multiple child entities', () => {
    test('templates can define additional child entities', async () => {
      const template = createConfigraphEntityTemplate({}, (t) => {
        t.addEntity({
          id: 'templateRoot',
          configSchema: {
            n1: {},
          },
        });
        t.addEntity({
          id: 'templateChild',
          configSchema: {
            n1: {},
          },
        });
        t.addEntity({
          id: 'templateGrandchild',
          parentId: 'templateChild',
          configSchema: {
            n1: {},
          },
        });
      });

      const g = new Configraph();
      const root = g.addEntity({ id: 'root' });
      const t1 = g.addEntity({
        id: 't1',
        extends: template,
        configSchema: {},
      });
      const t2 = g.addEntity({
        id: 't2',
        extends: template,
        configSchema: {},
      });
      g.processConfig();
      expect(Object.values(g.entitiesById).length).toEqual(7);
      // this checks some of our logic around IDs and that remapping from template id
      // to full id is working as expected
      expect(g.entitiesById['t1*templateChild'].parentId).toEqual('t1*templateRoot');
      expect(g.entitiesById['t1*templateGrandchild'].parentId).toEqual('t1*templateChild');
    });

    test('child templates can add additional entities', async () => {
      const baseTemplate = createConfigraphEntityTemplate({}, (t) => {
        t.addEntity({
          configSchema: {
            a: { value: 'a-base-template', description: 'a-base-template' },
          },
        });
      });
      const childTemplate = createConfigraphEntityTemplate({}, (t) => {
        t.addEntity({
          extends: baseTemplate,
        });
        t.addEntity({
          id: 'additionalChild1',
        });
      });
      const grandChildTemplate = createConfigraphEntityTemplate({}, (t) => {
        t.addEntity({
          extends: childTemplate,
        });
        t.addEntity({
          id: 'additionalChild2',
        });
      });

      const g = new Configraph();
      const root = g.addEntity({
        id: 't1',
        extends: grandChildTemplate,
        configSchema: {
        },
      });
      g.processConfig();
      expect(Object.values(g.entitiesById).length).toEqual(3);
    });

    test('template child entities can also extend other templates', async () => {
      const otherTemplate = createConfigraphEntityTemplate({}, (t) => {
        t.addEntity({
          id: 'otherRoot',
        });
        t.addEntity({
          id: 'otherChild',
        });
      });

      const template = createConfigraphEntityTemplate({}, (t) => {
        t.addEntity({
          id: 'templateRoot',
          configSchema: {
            n1: {},
          },
        });
        t.addEntity({
          id: 'templateChild',
          extends: otherTemplate,
        });
      });


      const g = new Configraph();
      const root = g.addEntity({
        id: 't1',
        extends: template,
      });
      g.processConfig();
      expect(Object.values(g.entitiesById).length).toEqual(3);
    });

    test('non-root template entities can be updated', async () => {
      const baseTemplate = createConfigraphEntityTemplate({
        description: 'base template',
      }, (t) => {
        t.addEntity({}); // root entity
        t.addEntity({
          id: 'child',
          configSchema: {
            a: { value: 'base-val' },
            b: { value: 'base-val' },
            c: { value: 'base-val' },
            obj: {
              extends: ConfigraphBaseTypes.object({
                oa: { value: 'base-val' },
                ob: { value: 'base-val' },
                oc: { value: 'base-val' },
              }),
            },
          },
        });
      });
      const childTemplate = createConfigraphEntityTemplate({
        description: 'child template',
      }, (t) => {
        t.addEntity({
          extends: baseTemplate,
        });
        t.updateEntity('child', {
          configSchema: {
            b: { value: 'child-val' },
            c: { value: 'child-val' },
            'obj.ob': { value: 'child-val' },
            'obj.oc': { value: 'child-val' },
          },
        });
      });

      const g = new Configraph();
      g.addEntity({
        id: 't1',
        extends: childTemplate,
      });
      g.updateEntity('t1*child', {
        configSchema: {
          c: { value: 'instance-val' },
          'obj.oc': { value: 'instance-val' },
        },
      });

      await g.resolveConfig();
      const e = g.entitiesById['t1*child'];
      expect(e.getConfigNodeByPath('a').resolvedValue).toEqual('base-val');
      expect(e.getConfigNodeByPath('obj.oa').resolvedValue).toEqual('base-val');
      expect(e.getConfigNodeByPath('b').resolvedValue).toEqual('child-val');
      expect(e.getConfigNodeByPath('obj.ob').resolvedValue).toEqual('child-val');
      expect(e.getConfigNodeByPath('c').resolvedValue).toEqual('instance-val');
      expect(e.getConfigNodeByPath('obj.oc').resolvedValue).toEqual('instance-val');
    });

    test('non-root template entities can be removed', async () => {
      const baseTemplate = createConfigraphEntityTemplate({
        description: 'base template',
      }, (t) => {
        t.addEntity({ id: 'root' });
        t.addEntity({ id: 'removed-by-child-template' });
        t.addEntity({ id: 'removed-by-graph' });
        t.addEntity({ id: 'not-removed' });
      });
      const childTemplate = createConfigraphEntityTemplate({
        description: 'child template',
      }, (t) => {
        t.addEntity({
          extends: baseTemplate,
        });
        t.removeEntity('removed-by-child-template');
      });

      const g = new Configraph();
      g.addEntity({
        id: 't1',
        extends: childTemplate,
      });
      // note we have to use the full ID here, since we are not within the template
      g.removeEntity('t1*removed-by-graph');

      await g.resolveConfig();
      expect(_.keys(g.entitiesById)).toEqual(['t1*root', 't1*not-removed']);
    });
  });
});
