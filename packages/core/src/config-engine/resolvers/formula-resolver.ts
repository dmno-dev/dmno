/* eslint-disable class-methods-use-this */
import { ResolverContext } from '../config-engine';
import { ConfigValueResolver, createResolver } from './resolvers';

export const dmnoFormula = (formula: string) => createResolver({
  icon: 'gravity-ui:curly-brackets-function',
  label: `formula: ${formula}`,
  async resolve(ctx) {
    return `${formula} = result`;
  },
});
