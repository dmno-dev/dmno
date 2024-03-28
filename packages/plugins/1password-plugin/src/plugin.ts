import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import _ from 'lodash-es';
import {
  ConfigPath, ConfigValueResolver, DmnoPlugin, ResolverContext,
  DmnoPluginInputSchema,
} from '@dmno/core';
import { OnePasswordTypes } from './data-types';


type ItemId = string;
type VaultId = string;
type VaultName = string;
type ReferenceUrl = string;
type ServiceAccountToken = string;






type ExtractType<T extends DmnoPluginInputSchema> = {
  [key in keyof T]: T[key]['extends']
};
type Test = ExtractType<typeof OnePasswordDmnoPlugin.inputSchema>;


// type InferAsType<T> =

// Typescript has some limitations around generics and how things work across parent/child classes
// so unfortunately, we have to add some extra type annotations, but it's not too bad
// see issues:
// - https://github.com/Microsoft/TypeScript/issues/3667
// - https://github.com/microsoft/TypeScript/issues/1373
// - https://github.com/microsoft/TypeScript/issues/23911
export class OnePasswordDmnoPlugin extends DmnoPlugin<typeof OnePasswordDmnoPlugin.inputSchema> {
  // Note we are explicitly passing the input schema back in as a type arg ^^^
  static inputSchema = {
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
  // ^^ note this explicit `satisfies` is needed to give us better typing on our inputSchema


  // TODO: this pattern of inputs always being values or paths and then
  // feeding them to inputs could be assumed to always be the case?
  // constructor(
  //   private options?: {
  //     token: ServiceAccountToken | ConfigPath,

  //     defaultVaultId?: VaultId | ConfigPath,
  //     // TODO: not sure if vault "name" is the right term here?
  //     defaultVaultName?: VaultName | ConfigPath
  //   },
  // ) {
  //   super();
  //   if (options?.token) this.setInputValue('token', options.token);
  //   if (options?.defaultVaultId) this.setInputValue('defaultVaultId', options.defaultVaultId);
  //   if (options?.defaultVaultName) this.setInputValue('defaultVaultName', options.defaultVaultName);
  // }

  // can read items by id - need a vault id, item id
  // and then need to grab the specific data from a big json blob
  // cli command `op item get bphvvrqjegfmd5yoz4buw2aequ --vault=ut2dftalm3ugmxc6klavms6tfq --format json`
  item(idOrIdAndVault: ItemId | { id: ItemId, vaultId: VaultId }, path?: string) {
    let vaultId: ValueOrGetter<VaultId>;
    let itemId: ItemId;


    // NOTE - will need to infer types on the inputs so we dont need these casts
    if (_.isString(idOrIdAndVault)) {
      itemId = idOrIdAndVault;
      if (!this.inputState.defaultVaultId.method) throw new Error('No vault ID specified');
      vaultId = this.getInputValueGetter<VaultId>('defaultVaultId');
    } else {
      itemId = idOrIdAndVault.id;
      vaultId = idOrIdAndVault.vaultId;
    }
    return new OnePasswordResolver(this.getInputValueGetter<ServiceAccountToken>('token'), {
      id: itemId,
      vaultId,
      path,
    });
  }


  // items have a "reference" which is like a URL that includes vault, item, and path to specific data
  // however these are not necessarily stable...
  // cli command `op read "op://dev test/example/username"`
  itemByReference(referenceUrl: ReferenceUrl) {
    // if reference starts with "op://" then it includes the vault
    // otherwise we'll prepend "op://vaultname/" to the value passed in
    if (referenceUrl.startsWith('op://')) {
      return new OnePasswordResolver(this.getInputValueGetter<ServiceAccountToken>('token'), {
        reference: referenceUrl,
      });
    } else {
      if (!this.inputState.defaultVaultName.method) {
        throw new Error('You must specify a default vault if using references names only');
      }
      const vaultName = this.getInputValueGetter<VaultName>('defaultVaultName');

      return new OnePasswordResolver(this.getInputValueGetter<ServiceAccountToken>('token'), {
        vaultName,
        referencePath: referenceUrl,
      });
    }
  }
}

type ValueOrGetter<T> = T | (() => T);
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
    private serviceAccountToken: ValueOrGetter<ServiceAccountToken>,
    private opts: {
      id: ValueOrGetter<ItemId>,
      vaultId: ValueOrGetter<VaultId>,
      path?: string
    } |
    { reference: string } |
    { vaultName: ValueOrGetter<VaultName>, referencePath: string },
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

    const token = unwrapGetter(this.serviceAccountToken);
    console.log('token', token);
    // this will eventually be already handled by checking input requirements
    if (!token) throw new Error('missing 1pass service account token');
    const injectToken = `OP_SERVICE_ACCOUNT_TOKEN=${token}`;

    let value: string | undefined;
    // read a single value by "reference"
    if ('reference' in opts) {
      value = await execSync([
        injectToken,
        CLI_PATH,
        `read "${opts.reference}"`,
        '--force --no-newline',
      ].join(' ')).toString();
    } else if ('referencePath' in opts) {
      const reference = `op://${unwrapGetter(opts.vaultName)}/${unwrapGetter(opts.referencePath)}`;

      value = await execSync([
        injectToken,
        CLI_PATH,
        `read "${reference}"`,
        '--force --no-newline',
      ].join(' ')).toString();

    // get an item by id + vault id
    } else {
      const valueJsonStr = await execSync([
        injectToken,
        CLI_PATH,
        `get item ${unwrapGetter(opts.id)}`,
        `--vault=${unwrapGetter(opts.vaultId)}`,
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



