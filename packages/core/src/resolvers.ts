/* eslint-disable class-methods-use-this */
import { match } from 'assert';
import _ from 'lodash-es';
import {
  DmnoConfigItem, DmnoConfigItemBase, DmnoPickedConfigItem, ResolverContext,
} from './config-engine';

// TODO: do we allow Date?
// what to do about null/undefined?
export type ConfigValue = string | number | boolean | null | { [key: string]: ConfigValue } | Array<ConfigValue>;
type ConfigValueInlineFunction = ((ctx: any) => ConfigValue | ConfigValueResolver);
export type ValueResolverDef =
  // static value
  ConfigValue |
  // resolver - ex: formula, fetch from vault, etc
  ConfigValueResolver |
  // inline function, which can return a value or another resolver
  ConfigValueInlineFunction;



export type ConfigValueOverride = {
  /** the value of the override */
  value: ConfigValue;

  /** comments about the item from the file */
  comments?: string

  // TODO: this will get more complex, as env files can be in different levels of the project
  /** where does the value come from */
  source: { type: 'environment' } | { type: 'file', fileName: string };
  /**
   * some overrides apply only in certan envs, for example if coming from `.env.production` */
  envFlag?: string;
};

type ResolverBranch = {
  label: string;
  resolver: ConfigValueResolver;
  condition: (ctx: ResolverContext) => boolean;
  isDefault: boolean;
};
export abstract class ConfigValueResolver {
  abstract icon: string;
  abstract getPreviewLabel(): string;
  abstract _resolve(ctx: ResolverContext): Promise<ConfigValue | ConfigValueResolver>;

  childBranches?: Array<ResolverBranch>;

  isResolved = false;
  resolvedValue?: ConfigValue;

  async resolve(ctx: ResolverContext) {
    let resolveResult: ConfigValue | ConfigValueResolver = await this._resolve(ctx);
    while (resolveResult instanceof ConfigValueResolver) {
      resolveResult = await resolveResult._resolve(ctx);
    }
    this.resolvedValue = resolveResult;
    this.isResolved = true;
  }
}

/** Resolver used to wrap inline functions into a proper resolver */
export class FunctionResolver extends ConfigValueResolver {
  constructor(readonly fn: ConfigValueInlineFunction) {
    super();
  }
  icon = 'f7:function';
  getPreviewLabel() {
    return 'function!';
  }
  async _resolve(ctx: ResolverContext) {
    return await this.fn.call(this, ctx);
  }
}


// NOT SURE IF THIS IS NEEDED YET?
/** Resolver used to wrap static values resolver (already resolved) */
export class StaticValueResolver extends ConfigValueResolver {
  constructor(readonly value: ConfigValue) {
    super();
  }
  icon = 'material-symbols:check-circle';
  getPreviewLabel() {
    return 'function!';
  }
  async _resolve(_ctx: ResolverContext) {
    return this.value;
  }
}


export class DmnoFormulaResolver extends ConfigValueResolver {
  constructor(readonly formula: string) {
    super();
  }
  icon = 'gravity-ui:curly-brackets-function';
  getPreviewLabel() {
    return 'formula!';
  }
  async _resolve(_ctx: ResolverContext) {
    return `${this.formula} = result`;
  }
}
// create DmnoFormula helper so we can use formulas without having to call `new`
export const dmnoFormula = (formula: string) => new DmnoFormulaResolver(formula);




export function processResolverDef(resolverDef: ValueResolverDef) {
  // set up value resolver
  if (_.isFunction(resolverDef)) {
    return new FunctionResolver(resolverDef);
  } else if (resolverDef instanceof ConfigValueResolver) {
    return resolverDef;
  } else if (resolverDef !== undefined) {
    return new StaticValueResolver(resolverDef);
  } else {
    console.log('invalid resolver definition', resolverDef);
    throw new Error('invalid resolver definition');
  }
}


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
    console.log('found matching branch');
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




export class DeferredDeploymentResolver extends ConfigValueResolver {
  icon = 'radix-icons:component-placeholder';
  getPreviewLabel() {
    return 'generated during deployment';
  }
  async _resolve(ctx: ResolverContext) {
    return 'resolved by deployment process';
  }
}
export const valueCreatedDuringDeployment = () => new DeferredDeploymentResolver();


export class PickedValueResolver extends ConfigValueResolver {
  /* eslint-disable class-methods-use-this */
  icon = 'material-symbols:content-copy-outline-sharp';
  getPreviewLabel() {
    return 'picked value';
  }

  constructor(private sourceItem: DmnoConfigItemBase, private valueTransform?: ((val: any) => any)) {
    super();
  }
  _resolve(_ctx: ResolverContext) {
    // since we handle resolution of services in the right order
    // we can assume the picked value will be resolved already (if it was possible at all)
    if (!this.sourceItem.isResolved) {
      return new Error('picked value has not been resolved yet');
    }
    if (this.valueTransform) {
      return this.valueTransform(this.sourceItem.resolvedValue);
    } else {
      return this.sourceItem.resolvedValue;
    }
  }
}

