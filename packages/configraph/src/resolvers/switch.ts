import * as _ from 'lodash-es';
import { SchemaError } from '../errors';
import {
  createResolver, InlineValueResolverDef, processInlineResolverDef, ResolverContext,
} from '../resolvers';

type SwitchByResolverOptions = Record<string, InlineValueResolverDef>;

export function switchBy(switchByKey: string, branches: SwitchByResolverOptions) {
  return createResolver({
    icon: 'gravity-ui:branches-right',
    label: `switch by ${switchByKey}`,
    process() {
      const containingEntity = this.configNode.parentEntity!;
      const switchFromNode = containingEntity.getConfigNodeByPath(switchByKey);
      if (!switchFromNode) {
        throw new SchemaError(`switchBy referencing invalid path - ${switchByKey}`);
      }
      this.dependsOnPathsObj[switchFromNode.fullPath] = 'schema';
    },
    resolveBranches: _.map(branches, (itemDef, itemKey) => ({
      // TODO: do we want to use a special symbol? or pass default as different arg?
      isDefault: itemKey === '_default' || itemKey === '_',
      condition: (ctx: ResolverContext) => ctx.get(switchByKey)?.toString() === itemKey,
      id: itemKey,
      label: `${switchByKey} === "${itemKey}"`,
      resolver: processInlineResolverDef(itemDef),
    })),
  });
}

/**
 * @deprecated better to use switchBy with a custom env flag
 *
 * @see https://dmno.dev/docs/guides/multi-env/
 * */
export const switchByNodeEnv = (branches: SwitchByResolverOptions) => switchBy('NODE_ENV', branches);
export const switchByDmnoEnv = (branches: SwitchByResolverOptions) => switchBy('DMNO_ENV', branches);

