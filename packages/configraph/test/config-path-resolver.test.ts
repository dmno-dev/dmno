import { expect, test, describe } from 'vitest';
import {
  Configraph, configPath,
  createConfigraphEntityTemplate,
} from '@dmno/configraph';


describe('configPath() resolver', () => {
  test('can reference other nodes within the same entity', async () => {
    const g = new Configraph();
    const e = g.addEntity({
      id: 'root',
      configSchema: {
        foo: { value: 'foo-val' },
        nodePathOnly: { value: configPath('foo') },
        singleDot: { value: configPath('.', 'foo') },
        byId: { value: configPath('root', 'foo') },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.nodePathOnly.resolvedValue).toEqual('foo-val');
    expect(e.configNodes.singleDot.resolvedValue).toEqual('foo-val');
    expect(e.configNodes.byId.resolvedValue).toEqual('foo-val');
  });

  test('can reference nodes in ancestor entities using ".." paths', async () => {
    const g = new Configraph();
    g.addEntity({
      id: 'root',
      configSchema: {
        foo: { value: 'grandparent-val' },
      },
    });
    g.addEntity({
      id: 'e1',
      configSchema: {
        foo: { value: 'parent-val' },
      },
    });
    const e = g.addEntity({
      id: 'e2',
      parentId: 'e1',
      configSchema: {
        oneUp: { value: configPath('..', 'foo') },
        twoUp: { value: configPath('../..', 'foo') },
        threeUp: { value: configPath('../../..', 'foo') },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.oneUp.resolvedValue).toEqual('parent-val');
    expect(e.configNodes.twoUp.resolvedValue).toEqual('grandparent-val');
    expect(e.configNodes.threeUp.isSchemaValid).toEqual(false);
  });

  test('can reference nodes in other entities by IDs', async () => {
    const g = new Configraph();
    g.addEntity({
      id: 'root',
      configSchema: {
        foo: { value: 'root-val' },
      },
    });
    g.addEntity({
      id: 'e1',
      configSchema: {
        foo: { value: 'e1-val' },
      },
    });
    g.addEntity({
      id: 'e2',
      parentId: 'e1',
      configSchema: {
        foo: { value: 'e2-val' },
      },
    });
    const e = g.addEntity({
      id: 'e3',
      configSchema: {
        rootFoo: { value: configPath('root', 'foo') },
        e1Foo: { value: configPath('e1', 'foo') },
        e2Foo: { value: configPath('e2', 'foo') },
        badEntityId: { value: configPath('bad-entity-id', 'foo') },
        badNodePath: { value: configPath('e2', 'bad-node-path') },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.rootFoo.resolvedValue).toEqual('root-val');
    expect(e.configNodes.e1Foo.resolvedValue).toEqual('e1-val');
    expect(e.configNodes.e2Foo.resolvedValue).toEqual('e2-val');
    expect(e.configNodes.badEntityId.isSchemaValid).toEqual(false);
    expect(e.configNodes.badNodePath.isSchemaValid).toEqual(false);
  });


  test('entity IDs are adjusted within templates', async () => {
    const template = createConfigraphEntityTemplate({}, (t) => {
      t.addEntity({
        id: 'root',
        configSchema: {
          foo: { value: 'template-root-val' },
          fromTemplateRoot: { value: configPath('root', 'foo') },
          fromTemplateSibling: { value: configPath('e1', 'foo') },
          fromTemplateBadEntity: { value: configPath('e2', 'foo') },
        },
      });
      t.addEntity({
        id: 'e1',
        configSchema: {
          foo: { value: 'template-e1-val' },
        },
      });
    });

    const g = new Configraph();
    g.addEntity({
      id: 'root',
      configSchema: {
        foo: { value: 'root-val' },
      },
    });
    g.addEntity({
      id: 'e1',
      configSchema: {
        foo: { value: 'e1-val' },
      },
    });
    g.addEntity({
      id: 'e2',
      configSchema: {
        foo: { value: 'e2-val' },
      },
    });
    const e = g.addEntity({
      id: 'templateInstance',
      extends: template,
      configSchema: {
        fromGraphRoot: { value: configPath('root', 'foo') },
        fromGraphSibling: { value: configPath('e1', 'foo') },
      },
    });
    await g.resolveConfig();
    expect(e.configNodes.fromGraphRoot.resolvedValue).toEqual('root-val');
    expect(e.configNodes.fromGraphSibling.resolvedValue).toEqual('e1-val');
    expect(e.configNodes.fromTemplateRoot.resolvedValue).toEqual('template-root-val');
    expect(e.configNodes.fromTemplateSibling.resolvedValue).toEqual('template-e1-val');
    expect(e.configNodes.fromTemplateBadEntity.isSchemaValid).toEqual(false);
  });
});
