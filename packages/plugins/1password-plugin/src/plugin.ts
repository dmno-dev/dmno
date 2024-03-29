import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import _ from 'lodash-es';
import {
  ConfigPath, ConfigValueResolver, DmnoPlugin, ResolverContext,
  DmnoPluginInputSchema,
  DmnoPluginInputMap,
  InjectPluginInputByType,
  _PluginInputTypes,
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
      extends: OnePasswordTypes.serviceAccountToken,
      required: true,
    },
    defaultVaultId: {
      extends: OnePasswordTypes.vaultId,
    },
    defaultVaultName: {
      extends: OnePasswordTypes.vaultName,
    },
  } satisfies DmnoPluginInputSchema;

  // this is likely the default for most plugins...
  // accept a mapping of how to fill inputs - each can be set to a
  // static value, config path, or use type-based injection
  constructor(inputs: DmnoPluginInputMap<typeof OnePasswordDmnoPlugin.inputSchema>) {
    super();
    this.setInputMap(inputs);
  }

  // ^^ note this explicit `satisfies` is needed to give us better typing on our inputSchema

  // can read items by id - need a vault id, item id
  // and then need to grab the specific data from a big json blob
  // cli command `op item get bphvvrqjegfmd5yoz4buw2aequ --vault=ut2dftalm3ugmxc6klavms6tfq --format json`
  item(idOrIdAndVault: ItemId | { id: ItemId, vaultId: VaultId }, path?: string) {
    let vaultId: VaultId | undefined;
    let itemId: ItemId;

    if (_.isString(idOrIdAndVault)) {
      itemId = idOrIdAndVault;
      if (!this.getInputState('defaultVaultId').method) throw new Error('No vault ID specified');
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
    // this.inputValues

    // this.setInputValue('token', true);
    // this.setInputValue('token', 'asdf');

    // .this.getInputState('defaultVaultId');
    // this.getInputState('');

    // if reference starts with "op://" then it includes the vault
    // otherwise we'll prepend "op://vaultname/" to the value passed in
    if (!referenceUrl.startsWith('op://')) {
      if (!this.getInputState('defaultVaultName').method) {
        throw new Error('You must specify a default vault if using references names only');
      }
    }
    return new OnePasswordResolver(this.inputValues, {
      reference: referenceUrl,
    });
  }
}

type ValueOrGetter<T> = T | (() => T | undefined);
function unwrapGetter<T>(valOrGetter: ValueOrGetter<T>) {
  if (_.isFunction(valOrGetter)) return valOrGetter();
  return valOrGetter;
}

const CLI_PATH = path.resolve(fileURLToPath(import.meta.url), '../../op-cli');
export class OnePasswordResolver extends ConfigValueResolver {
  icon = 'simple-icons:1password';
  getPreviewLabel() {
    return this.label;
  }

  private label: string;
  constructor(
    private pluginInputs: OnePasswordDmnoPlugin[typeof _PluginInputTypes],
    private opts: {
      itemId: ItemId,
      vaultId?: VaultId,
      path?: string
    } |
    { reference: string },
  ) {
    super();
    this.label = 'fetch from 1pass';
  }

  async _resolve(ctx: ResolverContext) {
    // console.log('Resolving 1password value!', ctx.fullPath);

    const opts = this.opts;




    // if ('id' in opts) {
    //   this.label = `${opts.vaultId}/${opts.id}`;
    //   // currently this means we're not reusing the cache for the same item if fetching different paths within that item
    //   this.cacheKey = `1pass:V|${opts.vaultId}/I|${opts.id}/P|${opts.path}`;
    // } else if ('reference' in opts) {
    //   this.label = opts.reference;
    //   this.cacheKey = `1pass:R|${opts.reference}`;
    // } else if ('vaultName' in opts) {
    //   const reference = `op://${unwrapGetter(opts.vaultName)}/${unwrapGetter(opts.vaultName)}`;
    //   this.label = reference;
    //   this.cacheKey = `1pass:R|${reference}`;
    // }

    // this will eventually be already handled by checking input requirements
    if (!this.pluginInputs.token) throw new Error('missing 1pass service account token');
    const injectToken = `OP_SERVICE_ACCOUNT_TOKEN=${this.pluginInputs.token}`;

    let value: string | undefined;
    // read a single value by "reference"
    if ('reference' in opts) {
      let fullReference = opts.reference;
      // if a partial path was passed in, we'll use a default vault name from the plugin settings
      if (!opts.reference.startsWith('op://')) {
        fullReference = `op://${this.pluginInputs.defaultVaultName}/${fullReference}`;
      }

      value = await execSync([
        injectToken,
        CLI_PATH,
        `read "${fullReference}"`,
        '--force --no-newline',
      ].join(' ')).toString();

    // get an item by id + vault id
    } else {
      const vaultId = opts.vaultId || this.pluginInputs.defaultVaultId;

      const valueJsonStr = await execSync([
        injectToken,
        CLI_PATH,
        `get item ${opts.itemId}`,
        `--vault=${vaultId}`,
        '--format json',
      ].join(' ')).toString();

      const valueObj = JSON.parse(valueJsonStr);
      if (opts.path) {
        value = _.get(valueObj, opts.path);
      }
    }
    if (value === undefined) {
      throw new Error(`unable to resolve 1pass item - ${this.label}`);
    }
    return value;
  }
}

// OnePasswordDmnoPlugin.init({ token: 'asdf' });


