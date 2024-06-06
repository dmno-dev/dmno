import _ from 'lodash-es';
import { ConfigItemDefinition, ConfigItemDefinitionOrShorthand } from './config-engine';
import { DmnoDataType } from './base-types';
// TODO: figure out how to get unique array typing...

// export function pickFromSchemaObject<S extends Record<string, any>>(schemaObj: S, keys: Array<keyof S>);
// export function pickFromSchemaObject<S extends Record<string, any>>(schemaObj: S, ...keys: Array<keyof S>);
export function pickFromSchemaObject<S extends Record<string, any>>(
  schemaObj: S,
  firstKeyOrKeyArray: keyof S | Array<keyof S>,
  ...keysRest: Array<keyof S>
) {
  const keyArray = _.isArray(firstKeyOrKeyArray) ? firstKeyOrKeyArray : [firstKeyOrKeyArray, ...keysRest];
  return Object.fromEntries(keyArray.map((k) => [k, schemaObj[k]]));
}


export function createVendorSchema(
  schema: Record<string, ConfigItemDefinitionOrShorthand>,
  commonTraits?: Partial<ConfigItemDefinition>,
) {
  if (!commonTraits) return schema;
  return _.mapValues(schema, (item, _itemKey) => {
    if (item instanceof DmnoDataType || _.isString(item) || _.isFunction(item)) {
      return {
        extends: item,
        ...commonTraits,
      };
    }
    return {
      ...item,
      ...commonTraits,
    };
  });
}
