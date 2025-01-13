import * as _ from 'lodash-es';
import {
  ConfigraphDataType, ConfigraphDataTypeDefinitionOrShorthand, ConfigraphDataTypeDefinition,
} from '@dmno/configraph';
import { DmnoDataTypeMetadata } from './configraph-adapter';
// TODO: figure out how to get unique array typing...

// export function pickFromSchemaObject<S extends Record<string, any>>(schemaObj: S, keys: Array<keyof S>);
// export function pickFromSchemaObject<S extends Record<string, any>>(schemaObj: S, ...keys: Array<keyof S>);
export function pickFromSchemaObject<
  S extends Record<string, ConfigraphDataTypeDefinition<DmnoDataTypeMetadata>>,
>(
  schemaObj: S,
  pickSettings: (
    keyof S |
    Array<keyof S> |
    Partial<Record<keyof S, ConfigraphDataTypeDefinition<DmnoDataTypeMetadata>>>
  ),
  ...keysRest: Array<keyof S>
): Partial<Record<keyof S, ConfigraphDataTypeDefinition<DmnoDataTypeMetadata>>> {
  if (_.isArray(pickSettings) || _.isString(pickSettings)) {
    const keyArray = _.isArray(pickSettings)
      ? pickSettings
      : [pickSettings, ...keysRest];
    return _.pick(schemaObj, keyArray);
  } else if (_.isObject(pickSettings)) {
    return _.mapValues(pickSettings, (itemOverrides, key) => {
      return {
        ...schemaObj[key],
        ...itemOverrides,
      };
    });
  } else {
    throw new Error('Invalid pick from schema');
  }
}


export function createVendorSchema<
  S extends Record<string, ConfigraphDataTypeDefinitionOrShorthand<DmnoDataTypeMetadata>>,
>(
  schema: S,
  commonTraits?: Partial<ConfigraphDataTypeDefinition<DmnoDataTypeMetadata>>,
): Record< keyof S, ConfigraphDataTypeDefinition<DmnoDataTypeMetadata>> {
  return _.mapValues(schema, (item, _itemKey) => {
    if (item instanceof ConfigraphDataType || _.isString(item) || _.isFunction(item)) {
      return {
        extends: item,
        ...commonTraits,
      };
    } else {
      return {
        // TODO: not sure why I need this any :(
        ...item as any,
        ...commonTraits,
      };
    }
    // throw Error('invalid vendor schema');
  });
}
