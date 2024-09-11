import { ConfigraphEntityDef } from './entity';

export class ConfigraphEntityTemplate {
  constructor(readonly meta: {
    label: string,
    // description: string,
  }) {

  }

  entities: Array<ConfigraphEntityDef> = [];
  addEntity(entityDef: ConfigraphEntityDef) {
    this.entities.push(entityDef);
  }

  get rootEntity() { return this.entities[0]; }
}
