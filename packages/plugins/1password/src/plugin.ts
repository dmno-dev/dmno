import { spawnSync } from 'child_process';
import _ from 'lodash-es';
import kleur from 'kleur';
import {
  DmnoPlugin, ResolverContext,
  DmnoPluginInputSchema,
  DmnoPluginInputMap,
  ResolutionError,
  SchemaError,
  _PluginInputTypesSymbol,
  loadDotEnvIntoObject,
} from 'dmno';
import { Client, createClient } from '@1password/sdk';

import { name as thisPackageName, version as thisPackageVersion } from '../package.json';
import { OnePasswordTypes } from './data-types';

type ItemId = string;
type VaultId = string;
type VaultName = string;
type ReferenceUrl = string;
type ServiceAccountToken = string;


async function execOpCliCommand(cmdArgs: Array<string>) {
  // using system-installed copy of `op`
  const cmd = spawnSync('op', cmdArgs);
  if (cmd.status === 0) {
    return cmd.stdout.toString();
  } else if (cmd.error) {
    if ((cmd.error as any).code === 'ENOENT') {
      throw new ResolutionError('1password cli `op` not found', {
        tip: [
          'By not using a service account token, you are relying on your local 1password cli installation for ambient auth.',
          'But your local 1password cli (`op`) was not found. Install it here - https://developer.1password.com/docs/cli/get-started/',
        ],
      });
    } else {
      throw new ResolutionError(`Problem invoking 1password cli: ${cmd.error.message}`);
    }
  } else {
    let errMessage = cmd.stderr.toString();
    // get rid of "[ERROR] 2024/01/23 12:34:56 " before actual message
    if (errMessage.startsWith('[ERROR]')) errMessage = errMessage.substring(28);
    if (errMessage.includes('authorization prompt dismissed')) {
      throw new ResolutionError('1password app authorization prompt dismissed by user', {
        tip: [
          'By not using a service account token, you are relying on your local 1password installation',
          'When the authorization prompt appears, you must authorize/unlock 1password to allow access',
        ],
      });
    } else if (errMessage.includes("isn't a vault in this account")) {
      throw new ResolutionError('1password vault not found in account connected to op cli', {
        tip: [
          'By not using a service account token, you are relying on your local 1password cli installation and authentication.',
          'The account currently connected to the cli does not contain (or have access) to the selected vault',
          'This must be resolved in your terminal - try running `op whoami` to see which account is connected to your `op` cli.',
          'You may need to call `op signout` and `op signin` to select the correct account.',
        ],
      });
    }
    // when the desktop app integration is not connected, some interactive CLI help is displayed
    // however if it dismissed, we get an error with no message
    // TODO: figure out the right workflow here?
    if (!errMessage) {
      throw new ResolutionError('1password cli not configured', {
        tip: [
          'By not using a service account token, you are relying on your local 1password cli installation and authentication.',
          'You many need to enable the 1password Desktop app integration, see https://developer.1password.com/docs/cli/get-started/#step-2-turn-on-the-1password-desktop-app-integration',
          'Try running `op whoami` to make sure the cli is connected to the correct account',
          'You may need to call `op signout` and `op signin` to select the correct account.',
        ],
      });
    }

    throw new Error(`op cli call failed: ${errMessage || 'unknown'}`);
  }
}

// const CLI_PATH = path.resolve(fileURLToPath(import.meta.url), '../../op-cli');

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
  icon = 'simple-icons:1password';

  // would be great to do this automatically as part of `DmnoPlugin` but I don't think it's possible
  // so instead we add some runtime checks in DmnoPlugin
  static pluginPackageName = thisPackageName;
  static pluginPackageVersion = thisPackageVersion;

  static readonly inputSchema = {
    token: {
      description: 'this service account token will be used via the CLI to communicate with 1password',
      extends: OnePasswordTypes.serviceAccountToken,
      // required: true,
    },
    envItemLink: {
      description: 'link to secure note item containing dotenv style values',
      extends: OnePasswordTypes.itemLink,
    },

  } satisfies DmnoPluginInputSchema;
  // ^^ note this explicit `satisfies` is needed to give us better typing on our inputSchema

  // this is likely the default for most plugins...
  // accept a mapping of how to fill inputs - each can be set to a
  // static value, config path, or use type-based injection
  // TODO: this is still not giving me types on the static input values... :(
  constructor(
    instanceName: string,
    inputs: DmnoPluginInputMap<typeof OnePasswordDmnoPlugin.inputSchema>,
  ) {
    super(instanceName);
    this.setInputMap(inputs);
  }

  private opClient: Client | undefined;
  private async initOpClientIfNeeded() {
    if (!this.inputValues.token) return
    if (!this.opClient) {
      this.opClient = await createClient({
        auth: this.inputValues.token,
        integrationName: this.pluginPackageName.replaceAll('@', '').replaceAll('/', ' '),
        integrationVersion: this.pluginPackageVersion,
      });
    }
  }
  private async getOpItemById(ctx: ResolverContext, vaultId: VaultId, itemId: ItemId) {
    await this.initOpClientIfNeeded();
    // using sdk
    if (this.opClient) {
      return await ctx.getOrSetCacheItem(`1pass-sdk:V|${vaultId}/I|${itemId}`, async () => {
        const opItem = await this.opClient!.items.get(vaultId, itemId);
        return JSON.parse(JSON.stringify(opItem)); // convert to plain object
      });
    }
    // using cli
    return await ctx.getOrSetCacheItem(`1pass-cli:V|${vaultId}/I|${itemId}`, async () => {
      const itemJson = await execOpCliCommand([
        'item', 'get', itemId,
        `--vault=${vaultId}`,
        '--format=json',
      ]);
      return JSON.parse(itemJson);
    });
  }
  private async getOpItemByReference(ctx: ResolverContext, referenceUrl: ReferenceUrl) {
    await this.initOpClientIfNeeded();
    // using sdk
    if (this.opClient) {
      return await ctx.getOrSetCacheItem(`1pass-sdk:R|${referenceUrl}`, async () => {
        return await this.opClient!.secrets.resolve(referenceUrl);
      });
    }
    // using op CLI
    return await ctx.getOrSetCacheItem(`1pass-cli:R|${referenceUrl}`, async () => {
      return await execOpCliCommand([
        'read', referenceUrl,
        '--force',
        '--no-newline',
      ]);
    });
  }


  


  private envItemsByService: Record<string, Record<string, string>> | undefined;
  private async loadEnvItems(ctx: ResolverContext) {
    // we've already validated the url is good and includes the query params
    const url = new URL(this.inputValues.envItemLink!);
    const vaultId = url.searchParams.get('v')!;
    const itemId = url.searchParams.get('i')!;


    const envItemsObj = await this.getOpItemById(ctx, vaultId, itemId);

    const loadedEnvByService: typeof this.envItemsByService = {};
    _.each(envItemsObj.fields, (field) => {
      if (field.purpose === 'NOTES') return;
      // the "default" items on a secure note get added to an invisible "add more" section
      // we could force users to only add in there? but it might get confusing...?
      const serviceName = field.label || field.title; // cli uses "label", sdk uses "title"

      // make sure we dont have a duplicate
      if (loadedEnvByService[serviceName]) {
        throw new ResolutionError(`Duplicate service entries found in 1pass item - ${serviceName} `);
      }
      const dotEnvObj = loadDotEnvIntoObject(field.value);
      loadedEnvByService[serviceName] = dotEnvObj;
      // TODO: deal with nested objects -- are paths "." or "__"?
      // TODO: do we want to allow other formats?
    });
    this.envItemsByService = loadedEnvByService;
  }
  item() {
    // make sure the user has mapped up an input for where the env data is stored
    if (!this.inputItems.envItemLink.resolutionMethod) {
      throw new SchemaError('You must set an `envItemLink` plugin input to use the .item() resolver');
    }

    return this.createResolver({
      label: (ctx) => {
        return `env blob item > ${ctx.serviceName} > ${ctx.itemPath}`;
      },
      resolve: async (ctx) => {
        if (!this.envItemsByService) await this.loadEnvItems(ctx);

        const itemValue = this.envItemsByService?.[ctx.serviceName!]?.[ctx.itemPath]
          // the label "_default" is used to signal a fallback / default to apply to all services
          || this.envItemsByService?._default?.[ctx.itemPath];

        if (itemValue === undefined) {
          throw new ResolutionError('Unable to find config item in 1password', {
            tip: [
              'Open the 1password item where your secrets are stored:',
              kleur.gray(`🔗 ${this.inputValues.envItemLink}`),
              `Find entry with label ${kleur.bold().cyan(ctx.serviceName!)} (or create it)`,
              'Add this secret like you would add it to a .env file',
              `For example: \`${ctx.itemPath}="your-secret-value"\``,
            ],
          });
        }

        // TODO: add metadata so you know if it came from a service or * item
        return itemValue;
      },
    });
  }


  /**
   * reference an item using a "private link" (and json path)
   *
   * To get an item's link, right click on the item and select "Copy Private Link" (or select the item and click the ellipses / more options menu)
   * */
  itemByLink(privateLink: string, path?: string) {
    const linkValidationResult = OnePasswordTypes.itemLink().validate(privateLink);

    if (linkValidationResult !== true) {
      // TOOD: add link to plugin docs
      throw new SchemaError(`Invalid item link - ${linkValidationResult[0].message}`);
    }

    const url = new URL(privateLink);
    const vaultId = url.searchParams.get('v')!;
    const itemId = url.searchParams.get('i')!;

    return this.itemById(vaultId, itemId, path);
  }


  // can read items by id - need a vault id, item id
  // and then need to grab the specific data from a big json blob
  // cli command `op item get bphvvrqjegfmd5yoz4buw2aequ --vault=ut2dftalm3ugmxc6klavms6tfq --format json`
  itemById(vaultId: VaultId, itemId: ItemId, path?: string) {
    return this.createResolver({
      label: (ctx) => {
        return _.compact([
          `Vault: ${vaultId}`,
          `Item: ${itemId}`,
          path && `Path: ${path}`,
        ]).join(', ');
      },
      resolve: async (ctx) => {
        // we've already checked that the defaultVaultId is set above if it's needed
        // and the plugin will have a schema error if the resolution failed

        const itemObj = await this.getOpItemById(ctx, vaultId, itemId);

        // TODO: path is necessary... maybe we could return the first item or something if none is specified?
        if (path) {
          const sectionsById = _.keyBy(itemObj.sections, (s) => s.id);
          const valueAtPath = _.find(itemObj.fields, (i) => {
            // using the cli, each item has the reference included
            if (i.reference) {
              // TODO: checking the reference ending is naive...
              return i.reference.endsWith(path);
            // using the sdk, we have to awkwardly reconstruct it
            } else {
              if (i.sectionId) return `${sectionsById[i.sectionId].title}/${i.title}` === path;
              else return i.title === path;
            }
          });

          if (!valueAtPath) {
            throw new Error(`Unable to resolve value at path ${path}`);
          }
          return valueAtPath.value;
        }

        // TODO: better error handling to tell you what went wrong? no access, non existant, etc

        return itemObj; 
      },
    });
  }


  // items have a "reference" which is like a URL that includes vault, item, and path to specific data
  // however these are not necessarily stable...
  // cli command `op read "op://dev test/example/username"`
  itemByReference(referenceUrl: ReferenceUrl) {
    // TODO: validate the reference url looks ok?

    return this.createResolver({
      label: referenceUrl,
      resolve: async (ctx) => {
        const value = await this.getOpItemByReference(ctx, referenceUrl);

        // TODO: better error handling to tell you what went wrong? no access, non existant, etc

        if (value === undefined) {
          throw new ResolutionError(`unable to resolve 1pass item - ${referenceUrl}`);
        }
        return value;
      },
    });
  }
}


// TODO: this should be autogenerated from the inputSchema and live in .dmno/.typegen folder
export interface OnePasswordDmnoPlugin {
  [_PluginInputTypesSymbol]: {
    /** 1password service account token used to fetch secrets */
    token: string,
    /** private link to item containing dotenv style values (optional) */
    envItemLink?: string;
    /** rely on auth from system installed `op` cli instead of a service account */
    useSystemCli?: boolean,
  }
}

// example of adding static stuff using a namespace
// namespace OnePasswordDmnoPlugin {
//   let newStatic: number;
// }
