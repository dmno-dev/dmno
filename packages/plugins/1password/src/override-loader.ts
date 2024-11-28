import {
  DmnoOverrideLoader, OverrideSource, parsedDotEnvToObj, ResolutionError,
} from 'dmno';
import { parseDotEnvContents } from 'dmno/utils';
import { ONEPASS_ICON } from './constants';
import { execOpCliCommand, opCliRead } from './cli-helper';

type OnePassLocation =
  // reference includes a field already
  { reference: string } |
  // selecting by name is possible without a vault, but will throw an error if multiple items are found
  { name: string, vault?: string, field?: string } |
  { link: string, field?: string };

async function getItemValue(loc: OnePassLocation, defaultFieldName?: string) {
  let rawItemJson: string;

  let fieldName: string | undefined;

  // reference includes a field
  if ('reference' in loc) {
    const itemValue = await opCliRead(loc.reference);
    return itemValue;
  } else if ('link' in loc) {
    rawItemJson = await execOpCliCommand([
      'item', 'get', loc.link,
      '--format=json',
    ]);
    fieldName = loc.field || defaultFieldName;
  } else if ('name' in loc) {
    // TODO: handle error when no vault id is provided and more than 1 item is found
    // TODO: also probably ok if zero items were found if looking up by name
    rawItemJson = await execOpCliCommand([
      'item', 'get', loc.name,
      ...loc.vault ? [`--vault="${loc.vault}"`] : [],
      '--format=json',
    ]);
    fieldName = loc.field || defaultFieldName;
  } else {
    throw new Error('invalid 1password location');
  }
  if (!fieldName) throw new Error('missing field name');

  if (!rawItemJson) {
    throw new Error('unable to fetch overrides from 1password');
  }

  const itemDetails = JSON.parse(rawItemJson);
  const fieldDetails = itemDetails.fields.find((f: any) => f.label === fieldName);
  return fieldDetails.value;
}


export function onePasswordOverrideLoader(
  itemLocation: OnePassLocation,
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
