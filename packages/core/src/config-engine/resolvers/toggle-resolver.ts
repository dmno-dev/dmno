/* eslint-disable class-methods-use-this */
import _ from 'lodash-es';

import { ConfigValueResolver, ValueResolverDef, processResolverDef } from './resolvers';
import { ResolverContext } from '../config-engine';

type ToggleOptions = Record<string, ValueResolverDef>;
export class ToggleResolver extends ConfigValueResolver {
  icon = 'gravity-ui:branches-right';
  getPreviewLabel() {
    return `toggle by ${this.toggleByKey}`;
  }
  constructor(readonly toggleByKey: string, readonly toggles: ToggleOptions) {
    super();

    // TODO: something special for default case?
    // TODO: should we use a symbol instead of "_default" ?
    this.childBranches = _.map(toggles, (itemDef, itemKey) => {
      return {
        // TODO: do we want to use a special symbol? or pass default as different arg?
        isDefault: itemKey === '_default' || itemKey === '_',
        condition: (ctx: ResolverContext) => ctx.get(this.toggleByKey) === itemKey,
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

export const toggleByNodeEnv = (toggles: ToggleOptions) => new ToggleResolver('NODE_ENV', toggles);
export const toggleByEnv = (toggles: ToggleOptions) => new ToggleResolver('DMNO_ENV', toggles);
export const toggleBy = (key: string, toggles: ToggleOptions) => new ToggleResolver(key, toggles);

