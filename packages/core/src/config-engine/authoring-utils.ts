import _, { first } from 'lodash-es';
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
