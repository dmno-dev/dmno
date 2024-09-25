import { ConfigraphEntityDef } from './entity';

export class ConfigraphEntityTemplate<EntityMetadata = {}, NodeMetadata = {}> {
  constructor(readonly meta: {
    label: string,
    // description: string,
  }) {

  }

  entities: Array<ConfigraphEntityDef<EntityMetadata, NodeMetadata>> = [];
  addEntity(entityDef: ConfigraphEntityDef<EntityMetadata, NodeMetadata>) {
    this.entities.push(entityDef);
  }

  get rootEntity() { return this.entities[0]; }
}
