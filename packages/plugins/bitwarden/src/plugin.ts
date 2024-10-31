import { DmnoPlugin, inject, PluginInputValue } from 'dmno';
import { BitwardenClient, DeviceType } from '@bitwarden/sdk-napi';

import { BITWARDEN_ICON } from './constants';

import packageJson from '../package.json';
import { BitwardenSecretsManagerTypes } from './data-types';

/**
 * DMNO plugin to retrieve secrets from Bitwarden Secrets Manager
 *
 * @see https://bitwarden.com/help/secrets-manager-overview/
 */
export class BitwardenSecretsManagerDmnoPlugin extends DmnoPlugin {
  icon = BITWARDEN_ICON;

  constructor(
    instanceName: string,
    inputValues?: {
      accessToken?: PluginInputValue,
      apiServerUrl?: string,
      identityServerUrl?: string,
    },
  ) {
    super(instanceName, {
      packageJson,
      inputSchema: {
        accessToken: {
          extends: BitwardenSecretsManagerTypes.machineAccountAccessToken,
          value: inputValues?.accessToken || inject(),
          required: true,
        },
        apiServerUrl: {
          extends: 'url',
          description: 'machine account API server url',
          value: inputValues?.apiServerUrl || 'https://vault.bitwarden.com/api',
          required: true,
          externalDocs: {
            description: 'Bitwarden docs - machine account config',
            url: 'https://bitwarden.com/help/machine-accounts/#configuration-information',
          },
        },
        identityServerUrl: {
          extends: 'url',
          description: 'machine account identity server url',
          value: inputValues?.identityServerUrl || 'https://vault.bitwarden.com/identity',
          required: true,
          externalDocs: {
            description: 'Bitwarden docs - machine account config',
            url: 'https://bitwarden.com/help/machine-accounts/#configuration-information',
          },
        },
      },
    });
  }

  private bwsClient: BitwardenClient | undefined;
  private async getSdkClient() {
    if (!this.bwsClient) {
      const accessToken = this.inputValue('accessToken') as string;
      const apiUrl = this.inputValue('apiServerUrl') as string;
      const identityUrl = this.inputValue('identityServerUrl') as string;

      this.bwsClient = new BitwardenClient({
        apiUrl,
        identityUrl,
        userAgent: 'DMNO Bitwarden Plugin',
        deviceType: DeviceType.SDK,
      }, 2);

      await this.bwsClient.auth().loginAccessToken(accessToken);
    }
    return this.bwsClient!;
  }

  /**
   * resolver to fetch a Bitwarden secret value by its UUID
   *
   * Secret UUIDs can be copied from the Secrets Manager UI at https://vault.bitwarden.com/
   *
   * @see https://bitwarden.com/help/secrets/
   */
  secretById(
    /**
     * Secret UUID
     *
     * @example 96ecea64-77e8-4898-a866-7ca87ffd798f
     */
    uuid: string,
  ) {
    return this.createResolver(() => {
      const isValid = BitwardenSecretsManagerTypes.secretId().validate(uuid);
      if (isValid !== true) throw isValid[0];

      return {
        label: `secret id ${uuid}`,
        resolve: async (ctx) => {
          return await ctx.getOrSetCacheItem(`bitwarden-sm:${uuid}`, async () => {
            const client = await this.getSdkClient();
            const secret = await client.secrets().get(uuid);
            return secret.value;
          });
        },
      };
    });
  }
}
