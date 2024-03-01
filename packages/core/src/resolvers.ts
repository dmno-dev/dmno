/* eslint-disable class-methods-use-this */

// TODO: do we allow Date?
// what to do about null/undefined?
type ConfigValue = string | number | boolean | null | { [key: string]: ConfigValue } | Array<ConfigValue>;
type ConfigValueInlineFunction = ((ctx: any) => ConfigValueOrResolver);
export type ConfigValueOrResolver =
  // static value
  ConfigValue |
  // resolver - ex: formula, fetch from vault, etc
  ConfigValueResolver |
  // inline function, which can return a value or another resolver
  ConfigValueInlineFunction;

export abstract class ConfigValueResolver<T = ConfigValue> {
  abstract icon: string;
  abstract getPreviewLabel(): string;
  abstract resolve(ctx: any): Promise<T | ConfigValueResolver>;
}

export class DmnoFormulaResolver extends ConfigValueResolver {
  constructor(readonly formula: string) {
    super();
  }
  icon = 'fluent:math-formula-16-filled';
  getPreviewLabel() {
    return 'formula!';
  }
  async resolve(_ctx: any) {
    return 'formula result!';
  }
}
// create DmnoFormula helper so we can use formulas without having to call `new`
export const dmnoFormula = (formula: string) => new DmnoFormulaResolver(formula);


type ToggleOptions = Record<string, ConfigValueOrResolver>;
export class ToggleResolver extends ConfigValueResolver {
  icon = 'gravity-ui:branches-right';
  getPreviewLabel() {
    return `toggle by ${this.toggleByKey}`;
  }
  constructor(readonly toggleByKey: string, readonly toggles: ToggleOptions) {
    super();
  }
  async resolve() {
    return 'resolved toggle value';
  }
}

export const toggleByEnv = (toggles: ToggleOptions) => new ToggleResolver('DMNO_ENV', toggles);
export const toggleBy = (key: string, toggles: ToggleOptions) => new ToggleResolver(key, toggles);


export class DeferredDeploymentResolver extends ConfigValueResolver {
  icon = 'radix-icons:component-placeholder';
  getPreviewLabel() {
    return 'generated during deployment';
  }
  async resolve() {
    return 'resolved by deployment process';
  }
}
export const valueCreatedDuringDeployment = () => new DeferredDeploymentResolver();

