import { ConfigraphEntity } from '../entity';
import { SchemaError } from '../errors';
import { ConfigValueResolver, createResolver } from '../resolvers';


export function configPath(entityPath: string, path: string): ConfigValueResolver;
export function configPath(path: string): ConfigValueResolver;
export function configPath(entityPathOrPath: string, pathOnly?: string): ConfigValueResolver {
  return createResolver({
    label: 'path',
    icon: 'majesticons:map-marker-path',
    process() {
      const parentEntity = this.configNode.parentEntity;
      if (!parentEntity) throw new Error('unable to detect parent entity');

      const graph = parentEntity.graphRoot;

      let entity: ConfigraphEntity | undefined;

      const nodePath = pathOnly || entityPathOrPath;
      const entityPath = pathOnly ? entityPathOrPath : '.';

      if (entityPath === '.') {
        entity = parentEntity;
      } else if (entityPath.startsWith('.')) {
        entity = parentEntity;
        for (const entityPathPart of entityPath.split('/')) {
          if (entityPathPart === '..') {
            entity = entity.parentEntity;

            if (!entity) {
              this.configNode.schemaErrors.push(new SchemaError(`Invalid entity path "${nodePath}" - reached the root`));
              return;
            }
          } else {
            // TODO: will need to support using relative paths within templates where IDs are not final
            this.configNode.schemaErrors.push(new SchemaError('Only ".." is supported for now'));
            return;
          }
        }
      } else {
        entity = graph.entitiesById[nodePath];
        if (!entity) {
          this.configNode.schemaErrors.push(new SchemaError(`Invalid entity id "${nodePath}"`));
          return;
        }
      }

      const nodeAtPath = entity.getConfigNodeByPath(nodePath);
      if (!nodeAtPath) {
        this.configNode.schemaErrors.push(new SchemaError(`Invalid configPath within node ${entity.id} - ${nodePath}`));
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
