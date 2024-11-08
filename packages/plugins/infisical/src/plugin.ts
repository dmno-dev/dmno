import {
  DmnoPlugin, inject, PluginInputValue, DmnoBaseTypes,
  ResolutionError,
} from 'dmno';
import { InfisicalSDK } from '@infisical/sdk';

import { INFISICAL_ICON } from './constants';

import packageJson from '../package.json';
import { InfisicalTypes } from './data-types';

/**
 * DMNO plugin to retrieve secrets from Infisical
 *
 * @see https://infisical.com/
 */
export class InfisicalDmnoPlugin extends DmnoPlugin {
  icon = INFISICAL_ICON;

  constructor(
    instanceName: string,
    inputValues: {
      clientId?: PluginInputValue,
      clientSecret?: PluginInputValue,
      environment: string,
      projectId?: PluginInputValue,
      siteUrl?: string,
    },
  ) {
    super(instanceName, {
      packageJson,
      inputSchema: {
        clientId: {
          extends: InfisicalTypes.clientId,
          value: inputValues?.clientId || inject(),
          required: true,
        },
        clientSecret: {
          extends: InfisicalTypes.clientSecret,
          value: inputValues?.clientSecret || inject(),
          required: true,
        },
        environment: {
          extends: InfisicalTypes.environment,
          value: inputValues?.environment,
          required: true,
        },
        projectId: {
          extends: InfisicalTypes.projectId,
          value: inputValues?.projectId || inject(),
          required: true,
        },
        siteUrl: {
          extends: DmnoBaseTypes.url(),
          value: inputValues?.siteUrl || 'https://app.infisical.com',
        },
      },
    });
  }

  private infisicalClient: InfisicalSDK | undefined;
  private async getSdkClient() {
    if (!this.infisicalClient) {
      const clientId = this.inputValue('clientId') as string;
      const clientSecret = this.inputValue('clientSecret') as string;
      // const environment = this.inputValue('environment') as string;

      this.infisicalClient = new InfisicalSDK({
        siteUrl: this.inputValue('siteUrl') as string,
      });

      // TODO: add support for other auth methods
      await this.infisicalClient.auth().universalAuth.login({
        clientId,
        clientSecret,
      });
    }
    return this.infisicalClient!;
  }

  /**
   * resolver to fetch a Infisical secret value by its name
   *
   * @see https://infisical.com/docs/documentation/platform/secrets/
   */
  secret(
    /**
     * Secret Name from Infisical dashboard
     *
     * @example MY_SECRET_NAME
     */
    nameOverride?: string,
  ) {
    return this.createResolver({
      label: (ctx) => {
        return `infisical secret > ${nameOverride || ctx.nodePath}`;
      },
      resolve: async (ctx) => {
        const secretName = nameOverride || ctx.nodePath;

        const isValid = DmnoBaseTypes.string().validate(secretName);
        if (isValid !== true) throw isValid[0];
        const environment = this.inputValue('environment') as string;
        const projectId = this.inputValue('projectId') as string;

        return await ctx.getOrSetCacheItem(`infisical:${projectId}:${environment}:${secretName}`, async () => {
          const client = await this.getSdkClient();
          try {
            const secret = await client.secrets().getSecret({
              environment,
              projectId,
              secretName,
            });
            return secret.secretValue;
          } catch (err) {
            throw new ResolutionError('Infisical secret not found', {
              tip: [
                `Check the secret name "${secretName}" and it's available in the "${environment}" environment`,
                `See ${this.inputValue('siteUrl')}/project/${projectId}/secrets/overview`,
              ],
            });
          }
        });
      },
    });
  }
}
