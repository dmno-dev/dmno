/* eslint-disable class-methods-use-this */
import { ResolverContext } from '../config-engine';
import { ConfigValueResolver } from './resolvers';

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
