import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import _ from 'lodash-es';
import kleur from 'kleur';
import {
  ConfigValueResolver, DmnoPlugin, ResolverContext,
  DmnoPluginInputSchema,
  DmnoPluginInputMap,
  ResolutionError,
  SchemaError,
  GetPluginInputTypes,
  createResolver,
  _PluginInputTypesSymbol,
  loadDotEnvIntoObject,
} from 'dmno';

import { OnePasswordTypes } from './data-types';

type ItemId = string;
type VaultId = string;
type VaultName = string;
type ReferenceUrl = string;
type ServiceAccountToken = string;

const CLI_PATH = path.resolve(fileURLToPath(import.meta.url), '../../op-cli');

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

  static readonly inputSchema = {
    token: {
      description: 'this service account token will be used via the CLI to communicate with 1password',
      extends: OnePasswordTypes.serviceAccountToken,
      required: true,
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



  private envItemsByService: Record<string, Record<string, string>> | undefined;
  private async loadEnvItems(ctx: ResolverContext) {
    // we've already validated the url is good and includes the query params
    const url = new URL(this.inputValues.envItemLink!);
    const vaultId = url.searchParams.get('v')!;
    const itemId = url.searchParams.get('i')!;

    const envItemJsonStr = await ctx.getOrSetCacheItem(`1pass:V|${vaultId}/I|${itemId}`, async () => {
      return await execSync([
        `OP_SERVICE_ACCOUNT_TOKEN=${this.inputValues.token}`,
        CLI_PATH,
        `item get ${itemId}`,
        `--vault=${vaultId}`,
        '--format json',
      ].join(' ')).toString();
    });
    const envItemsObj = JSON.parse(envItemJsonStr);

    const loadedEnvByService: typeof this.envItemsByService = {};
    _.each(envItemsObj.fields, (field) => {
      if (field.purpose === 'NOTES') return;
      // the "default" items on a secure note get added to an invisible "add more" section
      // we could force users to only add in there? but it might get confusing...?
      const serviceName = field.label;

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
            ].join('\n'),
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

        const valueJsonStr = await ctx.getOrSetCacheItem(`1pass:V|${vaultId}/I|${itemId}`, async () => {
          return await execSync([
            `OP_SERVICE_ACCOUNT_TOKEN=${this.inputValues.token}`,
            CLI_PATH,
            `item get ${itemId}`,
            `--vault=${vaultId}`,
            '--format json',
          ].join(' ')).toString();
        });

        const valueObj = JSON.parse(valueJsonStr);
        if (!valueObj) {
          throw new Error('Unable to resolve item');
        }

        if (path) {
          // TOOD: this logic is not right...
          const valueAtPath = _.find(valueObj.fields, (i) => {
            return i.reference.endsWith(path);
          });

          if (!valueAtPath) {
            throw new Error(`Unable to resolve value from path ${path}`);
          }
          return valueAtPath.value;
        }

        // TODO: better error handling to tell you what went wrong? no access, non existant, etc


        return valueObj;
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
        const value = await ctx.getOrSetCacheItem(`1pass:R|${referenceUrl}`, async () => {
          return await execSync([
            `OP_SERVICE_ACCOUNT_TOKEN=${this.inputValues.token}`,
            CLI_PATH,
            `read "${referenceUrl}"`,
            '--force --no-newline',
          ].join(' ')).toString();
        });

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
    /** token to be used... more jsdoc info... */
    token: string,
    /** private link to item containing dotenv style values */
    envItemLink?: string;
  }
}

// example of adding static stuff using a namespace
// namespace OnePasswordDmnoPlugin {
//   let newStatic: number;
// }
