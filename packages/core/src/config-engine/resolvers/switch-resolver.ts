/* eslint-disable class-methods-use-this */
import _ from 'lodash-es';

import { ConfigValueResolver, ValueResolverDef, processResolverDef } from './resolvers';
import { ResolverContext } from '../config-engine';

type SwitchByResolverOptions = Record<string, ValueResolverDef>;
export class SwitchByResolver extends ConfigValueResolver {
  icon = 'gravity-ui:branches-right';
  getPreviewLabel() {
    return `switch by ${this.switchByKey}`;
  }
  constructor(readonly switchByKey: string, readonly switchOptions: SwitchByResolverOptions) {
    super();

    // TODO: something special for default case?
    // TODO: should we use a symbol instead of "_default" ?
    this.childBranches = _.map(switchOptions, (itemDef, itemKey) => {
      return {
        // TODO: do we want to use a special symbol? or pass default as different arg?
        isDefault: itemKey === '_default' || itemKey === '_',
        condition: (ctx: ResolverContext) => ctx.get(this.switchByKey) === itemKey,
        label: itemKey, // ex: 'staging'
        resolver: processResolverDef(itemDef),
      };
    });
  }

  async _resolve(ctx: ResolverContext) {
    // find first branch that passes
    const matchingBranch = _.find(this.childBranches, (branch) => {
      if (branch.isDefault) return false;
      return branch.condition(ctx);
    });
    if (matchingBranch) {
      return matchingBranch.resolver || null;
    } else {
      const defaultBranch = _.find(this.childBranches, (branch) => branch.isDefault);
      return defaultBranch?.resolver || null;
    }
  }
}

export const switchByNodeEnv = (options: SwitchByResolverOptions) => new SwitchByResolver('NODE_ENV', options);
export const switchByDmnoEnv = (options: SwitchByResolverOptions) => new SwitchByResolver('DMNO_ENV', options);
export const switchBy = (key: string, options: SwitchByResolverOptions) => new SwitchByResolver(key, options);

