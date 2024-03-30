import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import _ from 'lodash-es';
import {
  ConfigValueResolver, DmnoPlugin, ResolverContext,
  DmnoPluginInputSchema,
  DmnoPluginInputMap,
  ResolutionError,
  SchemaError,
  GetPluginInputTypes,
} from '@dmno/core';
import { OnePasswordTypes } from './data-types';

type ItemId = string;
type VaultId = string;
type VaultName = string;
type ReferenceUrl = string;
type ServiceAccountToken = string;

// Typescript has some limitations around generics and how things work across parent/child classes
// so unfortunately, we have to add some extra type annotations, but it's not too bad
// see issues:
// - https://github.com/Microsoft/TypeScript/issues/3667
// - https://github.com/microsoft/TypeScript/issues/1373
// - https://github.com/microsoft/TypeScript/issues/23911
// export class OnePasswordDmnoPlugin extends DmnoPlugin<
// typeof OnePasswordDmnoPlugin.inputSchema, typeof OnePasswordDmnoPlugin.INPUT_TYPES
// > {
export class OnePasswordDmnoPlugin extends DmnoPlugin<OnePasswordDmnoPlugin> {
  static readonly inputSchema = {
    token: {
      description: 'this service account token will be used via the CLI to communicate with 1password',
      extends: OnePasswordTypes.serviceAccountToken,
      required: true,
    },
    defaultVaultId: {
      description: 'default vault id - only needed if using the .item() helper passing only an id',
      extends: OnePasswordTypes.vaultId,
    },
    defaultVaultName: {
      description: 'default vault name - only needed if using the .itemByReference() helper without full reference URLs',
      extends: OnePasswordTypes.vaultName,
    },
  } satisfies DmnoPluginInputSchema;
  // ^^ note this explicit `satisfies` is needed to give us better typing on our inputSchema

  // this is likely the default for most plugins...
  // accept a mapping of how to fill inputs - each can be set to a
  // static value, config path, or use type-based injection
  constructor(
    // TODO: this is still not giving me types on the static input values... :(
    inputs: DmnoPluginInputMap<typeof OnePasswordDmnoPlugin.inputSchema>,
  ) {
    super();
    this.setInputMap(inputs);
  }


  // can read items by id - need a vault id, item id
  // and then need to grab the specific data from a big json blob
  // cli command `op item get bphvvrqjegfmd5yoz4buw2aequ --vault=ut2dftalm3ugmxc6klavms6tfq --format json`
  item(idOrIdAndVault: ItemId | { id: ItemId, vaultId: VaultId }, path?: string) {
    let vaultId: VaultId | undefined;
    let itemId: ItemId;

    if (_.isString(idOrIdAndVault)) {
      itemId = idOrIdAndVault;
      if (!this.inputItems.defaultVaultId.resolutionMethod) {
        throw new SchemaError('No vault ID specified');
      }
    } else {
      itemId = idOrIdAndVault.id;
      vaultId = idOrIdAndVault.vaultId;
    }
    return new OnePasswordResolver(this.inputValues, {
      itemId,
      vaultId,
      path,
    });
  }


  // items have a "reference" which is like a URL that includes vault, item, and path to specific data
  // however these are not necessarily stable...
  // cli command `op read "op://dev test/example/username"`
  itemByReference(referenceUrl: ReferenceUrl) {
    // if reference starts with "op://" then it includes the vault name already
    // otherwise we'll prepend "op://vaultname/" to the value passed in
    if (!referenceUrl.startsWith('op://')) {
      if (!this.inputItems.defaultVaultName.resolutionMethod) {
        throw new SchemaError('You must specify a default vault if using references names only');
      }
    }
    return new OnePasswordResolver(this.inputValues, {
      reference: referenceUrl,
    });
  }
}

const CLI_PATH = path.resolve(fileURLToPath(import.meta.url), '../../op-cli');
export class OnePasswordResolver extends ConfigValueResolver {
  icon = 'simple-icons:1password';
  getPreviewLabel() {
    return this.label;
  }

  private label = '';
  constructor(
    private pluginInputs: GetPluginInputTypes<OnePasswordDmnoPlugin>,

    private opts: {
      itemId: ItemId,
      vaultId?: VaultId,
      path?: string
    } |
    { reference: string },
  ) {
    super();
  }

  async _resolve(ctx: ResolverContext) {
    const injectToken = `OP_SERVICE_ACCOUNT_TOKEN=${this.pluginInputs.token}`;

    const opts = this.opts;

    let value: string | undefined;
    // read a single value by "reference"
    if ('reference' in opts) {
      let fullReference = opts.reference;
      // if a partial path was passed in, we'll use a default vault name from the plugin settings
      if (!opts.reference.startsWith('op://')) {
        if (!this.pluginInputs.defaultVaultName) {
          throw new ResolutionError('Plugin input `defaultVaultName` was not resolved and is needed');
        }
        fullReference = `op://${this.pluginInputs.defaultVaultName}/${fullReference}`;
      }
      this.label = fullReference;

      value = await ctx.getOrSetCacheItem(`1pass:R|${opts.reference}`, async () => {
        return await execSync([
          injectToken,
          CLI_PATH,
          `read "${fullReference}"`,
          '--force --no-newline',
        ].join(' ')).toString();
      });

    // get an item by id + vault id
    } else {
      if (!opts.vaultId && !this.pluginInputs.defaultVaultId) {
        throw new ResolutionError('Plugin input `defaultVaultId` was not resolved and is needed');
      }

      const vaultId = opts.vaultId || this.pluginInputs.defaultVaultId;
      this.label = _.compact([
        `Vault: ${vaultId}`,
        `Item: ${opts.itemId}`,
        opts.path && `Path: ${opts.path}`,
      ]).join(', ');

      const valueJsonStr = await ctx.getOrSetCacheItem(`1pass:V|${vaultId}/I|${opts.itemId}`, async () => {
        return await execSync([
          injectToken,
          CLI_PATH,
          `get item ${opts.itemId}`,
          `--vault=${vaultId}`,
          '--format json',
        ].join(' ')).toString();
      });

      const valueObj = JSON.parse(valueJsonStr);
      if (opts.path) {
        value = _.get(valueObj, opts.path);
      }
    }
    if (value === undefined) {
      throw new ResolutionError(`unable to resolve 1pass item - ${this.label}`);
    }
    return value;
  }
}


