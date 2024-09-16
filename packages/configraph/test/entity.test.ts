import { expect, test, describe } from 'vitest';
import { Configraph, ConfigraphEntity, SerializedConfigraphEntity } from '@dmno/configraph';
import { ConfigraphEntityDef } from '../src/entity';

describe('graph entities', () => {
  describe('entity metadata', () => {
    test('entities can have additional domain-specific metadata', () => {
      // TODO: will try to extract this type info from the schema passed in
      type CustomEntityMetadata = {
        requiredMetadata: string,
        optionalMetadata?: string
      };
      const g = new Configraph<CustomEntityMetadata>({
        entityMetadata: {
          requiredMetadata: { required: true },
          optionalMetadata: {},
        },
      });
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
    //   });
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


      type CustomEntityMetadata = {
        extra1: string;
      };
      class CustomConfigraphEntity extends ConfigraphEntity<CustomEntityMetadata> {
        // eslint-disable-next-line @typescript-eslint/no-useless-constructor
        constructor(
          graphRoot: CustomConfigraph,
          def: ConfigraphEntityDef<CustomEntityMetadata, {}>,
        ) {
          super(graphRoot, def);
        }

        get extra1() { return this.getMetadata('extra1'); }

        toJSON() {
          return {
            ...super.toJSON(),
            extra1: this.extra1,
          };
        }
      }

      const g = new CustomConfigraph();
      const e = new CustomConfigraphEntity(g, {
        id: 'asdf',
        extra1: 'extra1-val',
      });
      expect(e.toJSON().extra1).toBe('extra1-val');
    });
  });
});
