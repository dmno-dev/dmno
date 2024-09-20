import { ConfigraphNode } from '../config-node';
import { SchemaError } from '../errors';
import { createResolver } from '../resolvers';

export function configPath(path: string) {
  return createResolver({
    label: 'path',
    icon: 'majesticons:map-marker-path',
    process() {
      const parentEntity = this.configNode.parentEntity;
      if (!parentEntity) throw new Error('unable to detect parent entity');

      // const parentEntityId = this.configNode.parentEntity?.id;
      // const fullPath = `${parentEntityId}!${path}`;

      const nodeAtPath = parentEntity.getConfigNodeByPath(path);
      if (!nodeAtPath) {
        this.configNode.schemaErrors.push(new SchemaError(`Invalid configPath within node ${parentEntity.id} - ${path}`));
      } else {
        this.dependsOnPathsObj[nodeAtPath.getFullPath()] = 'schema';
      }
    },
    resolve(ctx) {
      // not quite sure about this yet...
      const vals = ctx.getDeclaredDependencyValues();
      return vals[Object.keys(vals)[0]];
    },
  });
}
