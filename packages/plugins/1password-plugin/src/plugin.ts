import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import _ from 'lodash-es';
import {
  ConfigPath, ConfigValueResolver, DmnoPlugin, ResolverContext,
} from '@dmno/core';
import { OnePasswordServiceAccountToken, OnePasswordVaultId, OnePasswordVaultName } from './data-types';


type ItemId = string;
type VaultId = string;
type VaultName = string;
type ReferenceUrl = string;
type ServiceAccountToken = string;


export class OnePasswordDmnoPlugin extends DmnoPlugin {
  // Typescript can't infer types from a parent class
  // so unfortunately, we have to add this extra annotation
  // see issues:
  // - https://github.com/Microsoft/TypeScript/issues/3667
  // - https://github.com/microsoft/TypeScript/issues/1373
  // - https://github.com/microsoft/TypeScript/issues/23911

  inputSchema: DmnoPlugin['inputSchema'] = { // <- NOTICE THE WEIRD ANNOTATION
    token: {
      extends: OnePasswordServiceAccountToken,
      required: true,
    },
    vaultId: {
      extends: OnePasswordVaultId,
    },
    vaultName: {
      extends: OnePasswordVaultName,
    },
  };

  constructor(
    private options?: {
      token: ServiceAccountToken | ConfigPath,
      defaultVaultId?: VaultId,
      // TODO: not sure if vault "name" is the right term here?
      defaultVaultName?: VaultName | ConfigPath
    },
  ) {
    super();
  }

  // can read items by id - need a vault id, item id
  // and then need to grab the specific data from a big json blob
  // cli command `op item get bphvvrqjegfmd5yoz4buw2aequ --vault=ut2dftalm3ugmxc6klavms6tfq --format json`
  item(idOrIdAndVault: ItemId | { id: ItemId, vaultId: VaultId }, path?: string) {
    let vaultId: VaultId;
    let itemId: ItemId;

    if (_.isString(idOrIdAndVault)) {
      itemId = idOrIdAndVault;
      if (!this.options?.defaultVaultId) throw new Error('No vault ID specified');
      vaultId = this.options.defaultVaultId;
    } else {
      itemId = idOrIdAndVault.id;
      vaultId = idOrIdAndVault.vaultId;
    }
    return new OnePasswordResolver(this.options?.token || 'asdf', {
      id: itemId,
      vaultId,
      path,
    });
  }


  // items have a "reference" which is like a URL that includes vault, item, and path to specific data
  // however these are not necessarily stable...
  // cli command `op read "op://dev test/example/username"`
  itemByReference(referenceUrl: ReferenceUrl) {
    let fullReference = referenceUrl;
    // TODO: if reference starts with "op://" then it includes the vault
    if (!referenceUrl.startsWith('op://')) {
      if (!this.options?.defaultVaultName) {
        throw new Error('You must specify a default vault if using references names only');
      }
      // TODO: will need to prefix the reference path with the vault name when resolving
      fullReference = `op://${this.options?.defaultVaultName}/${fullReference}`;
    }

    return new OnePasswordResolver(this.options?.token || 'asdf', {
      reference: fullReference,
    });
  }
}

const CLI_PATH = path.resolve(fileURLToPath(import.meta.url), '../../op-cli');
export class OnePasswordResolver extends ConfigValueResolver {
  icon = 'simple-icons:1password';
  getPreviewLabel() {
    return this.label;
  }

  private label: string;
  constructor(
    private serviceAccountToken: ServiceAccountToken | ConfigPath,
    private opts: {
      id: ItemId,
      vaultId: VaultId,
      path?: string
    } | { reference: string },
  ) {
    super();
    if ('id' in opts) {
      this.label = `${opts.vaultId}/${opts.id}`;
      // currently this means we're not reusing the cache for the same item if fetching different paths within that item
      this.cacheKey = `1pass:V|${opts.vaultId}/I|${opts.id}/P|${opts.path}`;
    } else if ('reference' in opts) {
      this.label = opts.reference;
      this.cacheKey = `1pass:R|${opts.reference}`;
    }
    this.label = '-';
  }

  async _resolve(ctx: ResolverContext) {
    console.log('Resolving 1password value!', ctx.fullPath);

    let tokenValue: string | undefined;
    if (this.serviceAccountToken instanceof ConfigPath) {
      const resolvedTokenFromPath = await ctx.get(this.serviceAccountToken.path);
      console.log('1pass token = ', resolvedTokenFromPath);
      if (!resolvedTokenFromPath) {
        throw new Error(`Unable to resolve 1password token from path ${this.serviceAccountToken.path}`);
      }
      if (!_.isString(resolvedTokenFromPath)) {
        throw new Error('Resolved token is not a string');
      }
      tokenValue = resolvedTokenFromPath;
    } else {
      tokenValue = this.serviceAccountToken;
    }
    if (!tokenValue) {
      throw new Error('no op token');
    }

    const injectToken = `OP_SERVICE_ACCOUNT_TOKEN=${tokenValue}`;


    let value: string | undefined;
    if ('reference' in this.opts) {
      value = await execSync([
        injectToken,
        CLI_PATH,
        `read "${this.opts.reference}"`,
        '--force --no-newline',
      ].join(' ')).toString();
    } else {
      const valueJsonStr = await execSync([
        injectToken,
        CLI_PATH,
        `get item ${this.opts.id}`,
        `--vault=${this.opts.vaultId}`,
        '--format json',
      ].join(' ')).toString();

      const valueObj = JSON.parse(valueJsonStr);
      if (this.opts.path) {
        value = _.get(valueObj, this.opts.path);
      }
    }
    if (value === undefined) {
      throw new Error(`unable to resolve 1pass item - ${this.label}`);
    }
    return value;
  }
}



