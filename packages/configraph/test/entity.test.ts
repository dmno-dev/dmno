import { expect, test, describe } from 'vitest';
import _ from 'lodash-es';
import {
  Configraph, ConfigraphEntity, ConfigraphNode,
} from '@dmno/configraph';

describe('graph entities', () => {
  describe('entity metadata', () => {
    test('entities can have additional domain-specific metadata', () => {
      // TODO: will try to extract this type info from the schema passed in
      type CustomEntityMetadata = {
        requiredMetadata: string,
        optionalMetadata?: string
      };
      const g = new Configraph<CustomEntityMetadata>();
      const root = g.createEntity({
        id: 'root',
        requiredMetadata: 'root-required',
        optionalMetadata: 'root-optional',
      });
      expect(root.getMetadata('requiredMetadata')).toBe('root-required');
      expect(root.getMetadata('optionalMetadata')).toBe('root-optional');


      const child = g.createEntity({
        requiredMetadata: 'child-required',
        // optionalMetadata will be inherited from parent
      });
      expect(child.getMetadata('requiredMetadata')).toBe('child-required');
      expect(child.getMetadata('optionalMetadata')).toBe('root-optional');

      // TODO: also need to check how metadata is inherited via templates as well
    });

    // test('graph can set entity metadata serialization rules', () => {
    //   const g = new Configraph<{ extra1: string, extra2: string }>({
    //     entityMetadata: {
    //       extra1: { serialize: true },
    //       extra2: { serialize: false },
    //     },
    // });
    //   const e = g.createEntity({
    //     extra1: 'extra1-val',
    //     extra2: 'extra2-val',
    //   });
    //   const serialized = e.toJSON();
    //   expect(serialized.extra1).toBe('extra1-val');
    //   expect(serialized).not.toHaveProperty('extra2');
    // });
  });

  describe('metadata v2', () => {
    test('asdf', async () => {
      class CustomConfigraph extends Configraph {}

      type CustomNodeMetadata = {
        nodeExtra?: string,
      };

      class CustomConfigraphNode extends ConfigraphNode<CustomNodeMetadata> {
        toJSON() {
          return {
            ...super.toCoreJSON(),
            nodeExtra: this.type.getMetadata('nodeExtra'),
          };
        }
      }

      type CustomEntityMetadata = {
        entityExtra: string;
      };
      class CustomConfigraphEntity extends ConfigraphEntity<
      CustomEntityMetadata, CustomNodeMetadata, CustomConfigraphNode
      > {
        NodeClass = CustomConfigraphNode;

        get entityExtra() { return this.getMetadata('entityExtra'); }

        toJSON() {
          return {
            ...super.toCoreJSON(),
            entityExtra: this.entityExtra,
            configNodes: _.mapValues(this.configNodes, (item, _key) => item.toJSON()),
          };
        }
      }

      const g = new CustomConfigraph();
      const e = new CustomConfigraphEntity(g, {
        id: 'asdf',
        entityExtra: 'entity-metadata',
        configSchema: {
          c1: { nodeExtra: 'node-metadata' },
          c2: {},
        },
      });
      await g.resolveConfig();
      const entityJson = e.toJSON();
      expect(entityJson.entityExtra).toBe('entity-metadata');
      expect(entityJson.configNodes.c1.nodeExtra).toBe('node-metadata');
      expect(entityJson.configNodes.c2.nodeExtra).toBeUndefined();
    });
  });
});
