import path from 'path';
import fs from 'fs';
import {
  parse, modify, applyEdits, findNodeAtLocation, parseTree,
} from 'jsonc-parser';

function stringInsert(index: number, str: string, insertStr: string) {
  if (index > 0) return str.substring(0, index) + insertStr + str.substring(index, str.length);
  else return insertStr + str;
}

/**
 * updates tsconfig.json file to inject our dmno global types
 * */
export async function injectDmnoTypesIntoTsConfig(originalTsConfig: string) {
  // this is all a bit more involved then I would like, but the default methods that
  // jsonc-parser gives us to insert our types make the formatting look bad
  // and we need this to all just work magically as if you had added them yourself

  // there are likely some edge cases where this could fail, but should be very rare

  let editedTsConfig = originalTsConfig;
  const tsConfig = parse(originalTsConfig);
  const fileIncludes = tsConfig.include || [];

  const globalTypePath = '.dmno/.typegen/global.d.ts';
  const globalPublicTypePath = '.dmno/.typegen/global-public.d.ts';

  const globalTypesPresent = fileIncludes.includes(globalTypePath);
  const globalPublicTypesPresent = fileIncludes.includes(globalPublicTypePath);

  // if we find either the global or global public types, we'll just bail
  // TODO: not sure if we want to always make sure both are present?
  if (globalTypesPresent || globalPublicTypesPresent) {
    // we may want to return more specific info about what types were there?
    return;
  }


  // first add the `include: []` if its not there
  if (!('include' in tsConfig)) {
    const edits = modify(editedTsConfig, ['include'], [], {});
    // known edge case - extra comma insertion isn't happy if config is _completely_ empty
    edits[0].content = `,\n  ${edits[0].content.substring(1)}`;
    editedTsConfig = applyEdits(editedTsConfig, edits);
  }

  // ensure the last item has a comma after
  if (fileIncludes.length) {
    const jsonTree = parseTree(editedTsConfig);
    if (!jsonTree) throw new Error('parsing tsconfig failed');
    const lastItemNode = findNodeAtLocation(jsonTree, ['include', fileIncludes.length - 1]);
    if (!lastItemNode) throw new Error('tsconfig include items not found');
    const lastItemHasTrailingComma = !!editedTsConfig.substring(lastItemNode.offset + lastItemNode.length).match(/^\s*,/);
    if (!lastItemHasTrailingComma) {
      editedTsConfig = stringInsert(lastItemNode.offset + lastItemNode.length, editedTsConfig, ',');
    }
  }

  const jsonTree = parseTree(editedTsConfig);
  if (!jsonTree) throw new Error('parsing tsconfig failed');
  const includeNode = findNodeAtLocation(jsonTree, ['include']);
  if (!includeNode) throw new Error('no include property found in tsconfig.json');

  // insert our types just before the closing "]"
  editedTsConfig = stringInsert(includeNode.offset + includeNode.length - 1, editedTsConfig, [
    '', // line break before our types
    '    // inject DMNO_CONFIG globals',
    `    "${globalTypePath}",`,
    `    "${globalPublicTypePath}",`,
    '  ', // indentation for "]"
  ].join('\n'));

  return editedTsConfig;
}

