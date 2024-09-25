import { createResolver } from '../resolvers';
import { ConfigraphNode } from '../config-node';

export function createdPickedValueResolver(
  sourceNode: ConfigraphNode,
  valueTransform?: ((val: any) => any),
) {
  return createResolver({
    icon: 'material-symbols:content-copy-outline-sharp',
    label: 'picked value',
    process() {
      this.dependsOnPathsObj[sourceNode.fullPath] = 'schema';
    },
    async resolve() {
      // since we handle resolution of services in the right order
      // we can assume the picked value will be resolved already (if it was possible at all)
      if (!sourceNode.isResolved) {
        return new Error('picked value has not been resolved yet');
      }
      if (valueTransform) {
        return valueTransform(sourceNode.resolvedValue);
      } else {
        return sourceNode.resolvedValue;
      }
    },
  });
}

