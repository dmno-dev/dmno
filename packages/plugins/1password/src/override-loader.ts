import {
  DmnoOverrideLoader, OverrideSource, parsedDotEnvToObj, ResolutionError,
} from 'dmno';
import { parseDotEnvContents } from 'dmno/utils';
import { ONEPASS_ICON } from './constants';
import { getIdsFromShareLink, opCliRead } from './cli-helper';

type OnePassOverridesLocation =
  /** 1Password reference to where the overrides are stored */
  { reference: string } |
  /** item and vault ids (or names) of where the overrides are stored
   * field will default to the current service ID if not specified
   * */
  { item: string, vault: string, field?: string } |
  /**
   * shareable link to the item where the overrides are stored
   * field will default to the current service ID if not specified
   * */
  { link: string, field?: string };

async function getItemValue(loc: OnePassOverridesLocation, defaultFieldName?: string) {
  if ('reference' in loc) {
    return await opCliRead(loc.reference);
  } else if ('link' in loc) {
    const { vaultId, itemId } = getIdsFromShareLink(loc.link);
    return await opCliRead(`op://${vaultId}/${itemId}/${loc.field || defaultFieldName}`);
  } else if ('item' in loc) {
    return await opCliRead(`op://${loc.vault}/${loc.item}/${loc.field || defaultFieldName}`);
  } else {
    throw new Error('invalid 1password location');
  }
}


export function onePasswordOverrideLoader(
  itemLocation: OnePassOverridesLocation,
  opts?: {
    ignoreMissing?: boolean,
    // format?: 'dotenv' | 'toml' | 'yaml' // can add this if we want to support more formats later
  },
): DmnoOverrideLoader {
  return {
    async load(ctx) {
      // const start = +new Date();
      let dotEnvStr: string;
      try {
        dotEnvStr = await getItemValue(itemLocation, ctx.serviceId);
      } catch (err) {
        if (opts?.ignoreMissing && err instanceof ResolutionError && ['BAD_VAULT_REFERENCE', 'BAD_ITEM_REFERENCE', 'BAD_FIELD_REFERENCE'].includes(err.code || '')) {
          // we need to pass through a message somehow, so it can be displayed
          // easiest to attach to to a now disabled override loader instance
          // TODO: improve this whole situation... will depend on how we want to show this info
          return [
            new OverrideSource(
              '1password .env - disabled',
              'Loading overrides from 1Password failed, ignoring due to ignoreMissing flag',
              ONEPASS_ICON,
              {},
            ),
          ];
        }
        throw err;
      }
      const parsedDotEnv = parseDotEnvContents(dotEnvStr);
      const envObj = parsedDotEnvToObj(parsedDotEnv);
      // console.log('finished', +new Date() - start);

      return [
        new OverrideSource(
          '1password .env',
          '1pass item title?',
          ONEPASS_ICON,
          envObj,
        ),
      ];
    },
  };
}
