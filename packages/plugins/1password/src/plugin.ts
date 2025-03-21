import * as _ from 'lodash-es';
import kleur from 'kleur';
import {
  DmnoPlugin, ResolverContext,
  ResolutionError,
  SchemaError,
  loadDotEnvIntoObject,
  PluginInputValue,
  inject,
} from 'dmno';

import { Client, createClient } from '@1password/sdk';

import packageJson from '../package.json';
import { OnePasswordTypes } from './data-types';
import { execOpCliCommand, getIdsFromShareLink, opCliRead } from './cli-helper';

type FieldId = string;
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


/**
 * DMNO plugin to retrieve secrets from 1Password
 *
 * @see https://dmno.dev/docs/plugins/1password/
 */
export class OnePasswordDmnoPlugin extends DmnoPlugin {
  icon = 'simple-icons:1password';

  // this is likely the default for most plugins...
  // accept a mapping of how to fill inputs - each can be set to a
  // static value, config path, or use type-based injection
  // TODO: this is still not giving me types on the static input values... :(
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    instanceName: string,
    inputValues?: {
      token?: PluginInputValue,
      envItemLink?: string,
      fallbackToCliBasedAuth?: boolean,
    },
  ) {
    super(instanceName, {
      packageJson,
      inputSchema: {
        token: {
          description: 'this service account token will be used via the CLI to communicate with 1password',
          extends: OnePasswordTypes.serviceAccountToken,
          value: inputValues?.token || inject({ allowFailure: true }),
          // TODO: add validation, token must be set unless `fallbackToCliBasedAuth` is true
          // required: true,
        },
        envItemLink: {
          description: 'link to secure note item containing dotenv style values',
          extends: OnePasswordTypes.itemLink,
          value: inputValues?.envItemLink,
        },
        fallbackToCliBasedAuth: {
          description: "if token is empty, use system's `op` CLI to communicate with 1password",
          value: inputValues?.fallbackToCliBasedAuth,
        },
      },
    });
  }

  private get shouldUseSdk() {
    const opServiceAccountToken = this.inputValue('token');
    if (!opServiceAccountToken && !this.inputValue('fallbackToCliBasedAuth')) {
      throw new Error('Either a service account token must be provided, or you must enable `fallbackToCliBasedAuth`');
    }
    return !!opServiceAccountToken;
  }
  private opClient: Client | undefined;
  private async getSdkClient() {
    if (!this.shouldUseSdk) throw new Error('sdk client not needed');
    if (!this.opClient) {
      const opServiceAccountToken = this.inputValue('token');
      this.opClient = await createClient({
        auth: opServiceAccountToken as string, // TODO: figure out better way for this
        integrationName: packageJson.name.replaceAll('@', '').replaceAll('/', ' '),
        integrationVersion: packageJson.version,
      });
    }
    return this.opClient!;
  }

  private async getOpItemById(ctx: ResolverContext, vaultId: VaultId, itemId: ItemId): Promise<any> {
    if (this.shouldUseSdk) {
      return await ctx.getOrSetCacheItem(`1pass-sdk:V|${vaultId}/I|${itemId}`, async () => {
        const opClient = await this.getSdkClient();
        // TODO: better error handling to tell you what went wrong? no access, non existant, etc
        try {
          const opItem = await opClient.items.get(vaultId, itemId);
          return JSON.parse(JSON.stringify(opItem)); // convert to plain object
        } catch (err) {
          // 1pass sdk throws strings as errors...
          if (_.isString(err)) {
            if (err.includes('not a valid UUID')) {
              throw new ResolutionError('Either the Vault ID or the item ID is not a valid UUID');
            } else if (err === 'error when retrieving vault metadata: http error: unexpected http status: 404 Not Found') {
              throw new ResolutionError(`Vault ID "${vaultId}" not found in this account`);
            } else if (err === 'error when retrieving item details: http error: unexpected http status: 404 Not Found') {
              throw new ResolutionError(`Item ID "${itemId}" not found within Vault ID "${vaultId}"`);
            }
            throw new ResolutionError(`1password SDK error - ${err}`);
          }
          throw err;
        }
      });
    }

    // using cli
    const itemJson = await execOpCliCommand([
      'item', 'get', itemId,
      '--vault', vaultId,
      '--format', 'json',
    ]);
    return JSON.parse(itemJson);
  }

  private async getOpItemByReference(ctx: ResolverContext, referenceUrl: ReferenceUrl) {
    if (this.shouldUseSdk) {
      try {
        return await ctx.getOrSetCacheItem(`1pass-sdk:R|${referenceUrl}`, async () => {
          const opClient = await this.getSdkClient();
          // TODO: better error handling to tell you what went wrong? no access, non existant, etc
          const value = await opClient.secrets.resolve(referenceUrl);
          return value;
        });
      } catch (err) {
        // 1pass sdk throws strings as errors...
        if (_.isString(err)) {
          throw new ResolutionError(`1password SDK error - ${err}`);
        }
        throw err;
      }
    }

    // using op CLI
    return await opCliRead(referenceUrl);
  }

  private envItemsByService: Record<string, Record<string, string>> | undefined;
  private async loadEnvItems(ctx: ResolverContext) {
    // we've already validated the url is good and includes the query params
    const { vaultId, itemId } = getIdsFromShareLink(this.inputValue('envItemLink') as string);

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


  /**
   * resolver to fetch a 1password value from a .env blob within a text field.
   *
   * Plugin instance must be initialized with `envItemLink` input set to use this resolver.
   *
   * Items are looked up within the blob using their key
   *
   * @see https://dmno.dev/docs/plugins/1password/
   */
  item(
    /**
     * optionally override the key used to look up the item within the dotenv blob
     *
     * _not often necessary!_
     * */
    overrideLookupKey?: string,
  ) {
    return this.createResolver({
      label: (ctx) => {
        return `env blob item > ${ctx.entityId} > ${overrideLookupKey || ctx.nodePath}`;
      },
      resolve: async (ctx) => {
        // make sure the user has mapped up an input for where the env data is stored
        if (!(this.inputValue('envItemLink') as any)) {
          throw new SchemaError('You must set an `envItemLink` plugin input to use the .item() resolver');
        }


        if (!this.envItemsByService) await this.loadEnvItems(ctx);

        const lookupKey = overrideLookupKey || ctx.nodePath;

        const itemValue = this.envItemsByService?.[ctx.entityId!]?.[lookupKey]
          // the label "_default" is used to signal a fallback / default to apply to all services
          || this.envItemsByService?._default?.[lookupKey];

        if (itemValue === undefined) {
          throw new ResolutionError('Unable to find config item in 1password', {
            tip: [
              'Open the 1password item where your secrets are stored:',
              kleur.gray(`🔗 ${this.inputValue('envItemLink')}`),
              `Find entry with label ${kleur.bold().cyan(ctx.entityId!)} (or create it)`,
              'Add this secret like you would add it to a .env file',
              `For example: \`${lookupKey}="your-secret-value"\``,
            ],
          });
        }

        // TODO: add metadata so you know if it came from a service or * item
        return itemValue;
      },
    });
  }

  /**
   * resolver to fetch a 1password value using a "private link" and field ID
   *
   * To get an item's link, right click on the item and select `Copy Private Link` (or select the item and click the ellipses / more options menu)
   *
   * @see https://dmno.dev/docs/plugins/1password/
   * @see https://support.1password.com/item-links/
   */
  itemByLink(
    /**
     * 1password item _Private Link_
     *
     * @example "https://start.1password.com/open/i?a=..."
     */
    privateLink: string,
    /** 1password Item Field ID (or path) */
    fieldIdOrPath: FieldId | { path: string },
  ) {
    return this.createResolver(() => {
      const linkValidationResult = OnePasswordTypes.itemLink().validate(privateLink);

      if (linkValidationResult !== true) {
        // TODO: add link to plugin docs
        throw new SchemaError(`Invalid item link - ${linkValidationResult[0].message}`);
      }

      const { vaultId, itemId } = getIdsFromShareLink(privateLink);
      return this.itemById(vaultId, itemId, fieldIdOrPath);
    });
  }


  /**
   * resolver to fetch a 1password value using UUIDs and a field ID
   *
   * @see https://dmno.dev/docs/plugins/1password/
   */
  itemById(
    /** 1password Vault UUID */
    vaultId: VaultId,
    /** 1password Item UUID */
    itemId: ItemId,
    /** 1password Item Field id (or path) */
    fieldIdOrPath: FieldId | { path: string },
  ) {
    const fieldId = _.isString(fieldIdOrPath) ? fieldIdOrPath : undefined;
    const path = _.isObject(fieldIdOrPath) ? fieldIdOrPath.path : undefined;
    return this.createResolver({
      label: (ctx) => {
        return _.compact([
          `Vault: ${vaultId}`,
          `Item: ${itemId}`,
          fieldId && `Field: ${fieldId}`,
          path && `Path: ${path}`,
        ]).join(', ');
      },
      resolve: async (ctx) => {
        // we've already checked that the defaultVaultId is set above if it's needed
        // and the plugin will have a schema error if the resolution failed

        // if using the CLI, we can short-circuit and use our batched op read trick
        if (!this.shouldUseSdk) {
          const value = await opCliRead(`op://${vaultId}/${itemId}/${fieldId || path?.replace('.', '/')}`);
          return value;
        }


        const itemObj = await this.getOpItemById(ctx, vaultId, itemId);

        const sectionsById = _.keyBy(itemObj.sections, (s) => s.id);

        // field selection by id
        if (fieldId !== undefined) {
          const field = _.find(itemObj.fields, (f) => f.id === fieldId);
          if (field) {
            // do we want to throw an error if we found the value but its empty?
            return field.value;
          }
          // console.log(itemObj);
          const possibleFieldIds = _.compact(_.map(itemObj.fields, (f) => {
            if (f.value === undefined || f.value === '' || f.purpose === 'NOTES') return undefined;
            const section = sectionsById[f.sectionId || f.section?.id];
            return { id: f.id, label: f.label || f.title, sectionLabel: section?.label || section?.title };
          }));
          throw new ResolutionError(`Unable to find field ID "${fieldId}" in item`, {
            tip: [
              'Perhaps you meant one of',
              ...possibleFieldIds.map((f) => [
                '- ',
                f.sectionLabel ? `${f.sectionLabel} > ` : '',
                f.label,
                ` - ID = ${f.id}`,
              ].join('')),
            ],
          });
        }
        // field selection by path
        if (path) {
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
        throw new Error('Resolver must be passed a field ID or a path object');
        // should we fallback to first item or?
      },
    });
  }


  /**
   * resolver to fetch a 1password value using a secret reference URI
   *
   * @see https://dmno.dev/docs/plugins/1password/
   * @see https://developer.1password.com/docs/cli/secret-reference-syntax
   */
  itemByReference(
    /**
     * 1Password secret reference URI of the secret value
     *
     * 📚 {@link https://developer.1password.com/docs/cli/secret-reference-syntax/#get-secret-references | 1Password docs }
     */
    referenceUrl: ReferenceUrl,
  ) {
    return this.createResolver(() => {
      const linkValidationResult = OnePasswordTypes.secretReferenceUri().validate(referenceUrl);

      if (linkValidationResult !== true) {
        throw new SchemaError(`Invalid item reference - ${linkValidationResult[0].message}`);
      }


      // TODO: validate the reference url looks ok?
      return {
        label: referenceUrl,
        resolve: async (ctx) => {
          const value = await this.getOpItemByReference(ctx, referenceUrl);

          // TODO: better error handling to tell you what went wrong? no access, non existant, etc

          if (value === undefined) {
            throw new ResolutionError(`unable to resolve 1pass item - ${referenceUrl}`);
          }
          return value;
        },
      };
    });
  }
}
