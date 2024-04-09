/* eslint-disable class-methods-use-this */
import _ from 'lodash-es';

import {
  InlineValueResolverDef, createResolver, processInlineResolverDef,
} from './resolvers';
import { ResolverContext } from '../config-engine';

type SwitchByResolverOptions = Record<string, InlineValueResolverDef>;

export const switchBy = (switchByKey: string, branches: SwitchByResolverOptions) => {
  return createResolver({
    icon: 'gravity-ui:branches-right',
    label: `switch by ${switchByKey}`,
    resolveBranches: _.map(branches, (itemDef, itemKey) => ({
      // TODO: do we want to use a special symbol? or pass default as different arg?
      isDefault: itemKey === '_default' || itemKey === '_',
      condition: (ctx: ResolverContext) => ctx.get(switchByKey) === itemKey,
      id: itemKey,
      label: `${switchByKey} === "${itemKey}"`,
      resolver: processInlineResolverDef(itemDef),
    })),
  });
};

export const switchByNodeEnv = (branches: SwitchByResolverOptions) => switchBy('NODE_ENV', branches);
export const switchByDmnoEnv = (branches: SwitchByResolverOptions) => switchBy('DMNO_ENV', branches);
