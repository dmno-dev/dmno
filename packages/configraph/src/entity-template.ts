/** A template is a reusable/extendable set of entities
 *
 * The template itself does not contain much, just a little metadata. The interesting
 * bits are all in the entities that the template is made of
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { ExternalDocsEntry } from './common';
import { ConfigraphEntity, ConfigraphEntityDef } from './entity';

export type ConfigraphEntityTemplateMeta = {
  /** template's unique ID */
  id?: string,

  label?: string, // human readable name
  summary?: string, // short description
  description?: string, // longer description, supports markdown
  externalDocs?: ExternalDocsEntry | Array<ExternalDocsEntry>,

  /** icon to use, see https://icones.js.org/ for available options
  * @example mdi:aws
  */
  icon?: string;

  /** color (any valid css color)
  * @example FF0000
  */
  color?: string;
};

export class ConfigraphEntityTemplate<
  EntityMetadata = any,
  NodeMetadata = any,
> {
  constructor(
    readonly templateMetadata: ConfigraphEntityTemplateMeta,
    /** stores a reference to the current executing entity */
    readonly linkedEntity: ConfigraphEntity,
  ) {
    // TODO: probably clean this up
    // when this gets called, the linked entity hasnt gotten the extra `/root` yet
    if (!linkedEntity.templateIdBase) throw new Error('Expected template base id to be set');
    this.baseId = linkedEntity.templateIdBase;
  }

  packageName?: string;
  packageVersion?: string;

  addedEntityDefs: Array<ConfigraphEntityDef<EntityMetadata, NodeMetadata>> = [];
  updatedEntityDefs: Record<string, ConfigraphEntityDef<EntityMetadata, NodeMetadata>> = {};
  removedEntityIds: Array<string> = [];

  baseId: string = '';
  rootRelativeId: string = '';

  // NOTE - all the interesting logic happens in ConfigraphEntity
  addEntity(entityDef: ConfigraphEntityDef<EntityMetadata, NodeMetadata>) {
    // we track the root id as soon as we know it
    if (!this.addedEntityDefs.length) {
      this.rootRelativeId = entityDef.id || 'root';
    }
    this.addedEntityDefs.push(entityDef);
  }
  removeEntity(entityId: string) {
    this.removedEntityIds.push(entityId);
  }
  updateEntity(
    entityId: string,
    entityDef: ConfigraphEntityDef<EntityMetadata, NodeMetadata>,
  ) {
    this.updatedEntityDefs[entityId] = entityDef;
  }

  get rootEntityDef() { return this.addedEntityDefs[0]; }
}
export const templateContextAls = new AsyncLocalStorage<ConfigraphEntityTemplate>();



export function createConfigraphEntityTemplate<EntityMetadata = {}, NodeMetadata = {}>(
  templateMeta: ConfigraphEntityTemplateMeta,
  defineEntitiesFn: (t: ConfigraphEntityTemplate<EntityMetadata, NodeMetadata>) => void,
) {
  // might want to copy passing the factory fn reference into the template
  // like we do for data types? although not needed yet
  const entityTemplateFactoryFn = (executingEntity: ConfigraphEntity) => {
    const t = new ConfigraphEntityTemplate<EntityMetadata, NodeMetadata>(templateMeta, executingEntity);
    // this ALS context allows us to adjust template relative paths within "pick" (and other resolvers if necessary)
    templateContextAls.run(t, () => {
      defineEntitiesFn(t);
    });
    return t;
  };
  entityTemplateFactoryFn._isConfigraphEntityTemplateFactory = true;
  return entityTemplateFactoryFn;
}
