import { ConfigraphEntity } from '../entity';
import { templateContextAls } from '../entity-template';
import { SchemaError } from '../errors';
import { ConfigValueResolver, createResolver } from '../resolvers';


export function configPath(entityPath: string, path: string): ConfigValueResolver;
export function configPath(path: string): ConfigValueResolver;
export function configPath(entityPathOrPath: string, pathOnly?: string): ConfigValueResolver {
  // if we are within a template, we need to adjust the entity id to be relative to the template
  const templateContext = templateContextAls.getStore();
  const entityPathBase = templateContext?.baseId || '';

  return createResolver({
    label: 'path',
    icon: 'majesticons:map-marker-path',
    process() {
      const thisEntity = this.configNode.parentEntity;
      if (!thisEntity) throw new Error('unable to detect parent entity');

      const graph = thisEntity.graphRoot;

      let entity: ConfigraphEntity | undefined;

      const nodePath = pathOnly || entityPathOrPath;
      const entityPath = pathOnly ? entityPathOrPath : '.';

      if (entityPath === '.') {
        entity = thisEntity;
      } else if (entityPath.startsWith('.')) {
        entity = thisEntity;
        for (const entityPathPart of entityPath.split('/')) {
          if (entityPathPart === '..') {
            entity = entity.parentEntity;

            // TODO: if we are within a template, we should not let you go above the template root
            if (!entity) {
              throw new SchemaError(`Invalid entity path "${nodePath}" - reached the root`);
            }
          } else {
            throw new SchemaError('Only ".." is supported for now');
          }
        }
      } else {
        const fullEntityPath = entityPathBase + entityPath;
        entity = graph.entitiesById[fullEntityPath];
        if (!entity) {
          throw new SchemaError(`Invalid entity id "${fullEntityPath}"`);
        }
      }

      const nodeAtPath = entity.getConfigNodeByPath(nodePath);
      if (!nodeAtPath) {
        throw new SchemaError(`Invalid configPath within node ${entity.id} - ${nodePath}`);
      } else {
        this.dependsOnPathsObj[nodeAtPath.fullPath] = 'schema';
      }
    },
    resolve(ctx) {
      // not quite sure about this yet...
      const vals = ctx.getDeclaredDependencyValues();
      return vals[Object.keys(vals)[0]];
    },
  });
}
