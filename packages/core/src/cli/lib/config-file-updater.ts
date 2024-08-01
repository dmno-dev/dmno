import _ from 'lodash-es';
import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import tsPlugin from 'acorn-typescript';
import { fdir } from 'fdir';
import { stringInsert } from './string-utils';

type ConfigFileUpdateActions =
  { arrayContains: string }
  | { wrapWithFn: string }
  | { addComment: string };


export async function findOrCreateConfigFile(
  baseDir: string,
  glob: string,
  createSettings?: {
    fileName: string,
    contents: string,
  },
) {
  const expandedPathsFromGlobs = await (
    new fdir() // eslint-disable-line new-cap
      .withRelativePaths()
      .glob(glob)
      .crawl(baseDir)
      .withPromise()
  );
  if (!expandedPathsFromGlobs.length) {
    if (createSettings) {
      const newFilePath = `${baseDir}/${createSettings.fileName}`;
      return { createWithContents: createSettings.contents, path: newFilePath };
    } else {
      throw new Error(`failed to find matching config file in ${baseDir} with glob "${glob}"`);
    }
  } else if (expandedPathsFromGlobs.length > 1) {
    throw new Error(`found multiple matching config files in ${baseDir} with glob "${glob}"`);
  }
  return { path: `${baseDir}/${expandedPathsFromGlobs[0]}` };
}

export async function updateConfigFile(
  originalSrc: string,
  opts: {
    imports?: Array<{
      moduleName: string,
      importDefaultAs?: string,
      importVars?: Array<string>;
    }>,
    updates?: Array<{
      // so far, we only need to modify the default export, but we may need other options
      symbol: string,
      path?: Array<string>,
      action: ConfigFileUpdateActions,
    }>
  },
) {
  const mods: Array<{ insertAt: number, text: string }> = [];

  // @ts-ignore
  const parser = acorn.Parser.extend(tsPlugin());
  const ast = parser.parse(originalSrc, { sourceType: 'module', ecmaVersion: 'latest', locations: true });
  // console.dir(ast, { depth: null });

  const importNodes: Array<acorn.ImportDeclaration> = ast.body.filter((n) => n.type === 'ImportDeclaration') as any;

  // determine existing style of quotes / semicolons
  const q = importNodes?.[0]?.source.raw?.endsWith('"') ? '"' : "'";
  const semi = (!importNodes.length || originalSrc.substr(importNodes[0].end - 1, 1) === ';') ? ';' : '';

  for (const singleImport of opts.imports || []) {
    const { moduleName, importDefaultAs, importVars } = singleImport;
    // first see if the file is already imported
    const existingImportNode = importNodes.find((n) => n.source.value === moduleName);
    if (existingImportNode) {
      // here we could edit the exiting import, but for now we'll assume that if the import exists
      // then the user already knows what they are doing

      // we may also need to know what vars/names they imported
    } else {
      /* eslint-disable no-nested-ternary, prefer-template */
      const importStr = 'import '
        + (importDefaultAs || '')
        + ((importDefaultAs && importVars?.length) ? ', ' : '')
        + (importVars?.length ? `{ ${importVars?.join(', ')} }` : '')
        + ((importDefaultAs || importVars?.length) ? ' from ' : '')
        + `${q}${moduleName}${q}${semi}`;


      // TODO: if there are no existing imports, we may want to insert after any comments rather than the start of the file
      mods.push({
        insertAt: importNodes[0]?.start || 0,
        text: `${importStr}\n`,
      });

      // logic to import last - we could add this as an _option_ if useful
      // // we'll insert our import as the last one before any local files
      // const lastModuleImportNode = importNodes.findLast((n) => {
      //   const importedStr = n.source.value as string;
      //   return !importedStr.startsWith('./') && !importedStr.startsWith('../');
      // });
      // mods.push({
      //   // if no imports, we could potentially find the last comment or something?
      //   insertAt: lastModuleImportNode?.end || 0,
      //   text: `\n${importStr}`,
      // });
    }
  }

  for (const singleUpdate of opts.updates || []) {
    // currently we're always updating the default export
    // as we encounter more use cases, we can expand all our options here
    let nodeToUpdate: acorn.AnyNode | undefined;
    let pathNodeToUpdate: acorn.AnyNode | undefined;

    // this handles the default export, whether its `export default X` or `module.exports = X`
    if (singleUpdate.symbol === 'EXPORT') {
      for (const n of ast.body) {
        // matches `export default ...`
        if (n.type === 'ExportDefaultDeclaration') {
          nodeToUpdate = n.declaration;
        // matches `module.exports = ...`
        } else if (
          n.type === 'ExpressionStatement'
          && n.expression.type === 'AssignmentExpression' && n.expression.operator === '='
          && originalSrc.substring(n.expression.left.start, n.expression.left.end) === 'module.exports'
        ) {
          nodeToUpdate = n.expression.right;
        }
        if (nodeToUpdate) break;
      }
      if (!nodeToUpdate) throw new Error('Unable to find `export default` or `module.exports = `');

    // this looks for a function call by name
    } else if (singleUpdate.symbol.endsWith('()')) {
      const indexOfFn = originalSrc.indexOf(singleUpdate.symbol.substring(0, singleUpdate.symbol.length - 1));
      nodeToUpdate = acornWalk.findNodeAfter(ast, indexOfFn)?.node as acorn.AnyNode;
      if (!nodeToUpdate) throw new Error(`Unable to find fn call \`${singleUpdate.symbol}\``);
    } else {
      throw new Error('invalid symbol to update');
    }

    // if a path was passed in, we'll try to find it in an object
    if (singleUpdate.path) {
      // if the node is a function call we'll dive into it and assume we want the first arg
      // (this matches the `export default defineConfig({...})` pattern that many config files use)
      if (nodeToUpdate.type === 'CallExpression' && nodeToUpdate.arguments.length) {
        nodeToUpdate = nodeToUpdate.arguments[0];
      }
      if (nodeToUpdate.type !== 'ObjectExpression') {
        throw new Error('Expected to find an object node to use apply the path selector');
      }
      // currently only supports path of depth 1, but should support going deeper
      pathNodeToUpdate = nodeToUpdate.properties.find((n) => n.type === 'Property' && (n.key as any).name === singleUpdate.path![0]);
      if (pathNodeToUpdate && pathNodeToUpdate.type !== 'Property') {
        throw new Error('Node is not a property');
      }
    }

    if (!nodeToUpdate) {
      throw new Error('unable to find AST node to update');
    }

    // this action will ensure an array contains an item matching some code
    if ('arrayContains' in singleUpdate.action) {
      // handle the case where the path doesn't exist in the object yet
      if (!pathNodeToUpdate) {
        if (nodeToUpdate.type === 'ObjectExpression') {
          const objectSrc = originalSrc.substring(nodeToUpdate.start, nodeToUpdate.end);
          const isMultiLine = objectSrc.includes('\n');
          // handle multi-line objects
          if (isMultiLine) {
            const lastProperty = nodeToUpdate.properties[nodeToUpdate.properties.length - 1];
            const trailingComma = originalSrc.substring(lastProperty.end, lastProperty.end + 1) === ',';
            const numSpaces = lastProperty.start - originalSrc.lastIndexOf('\n', lastProperty.start) - 1;

            mods.push({
              insertAt: lastProperty.end + (trailingComma ? 1 : 0),
              text: [
                '\n',
                ' '.repeat(numSpaces),
                `${singleUpdate.path}: [${singleUpdate.action.arrayContains}]`,
                trailingComma ? ',' : '',
              ].join(''),
            });
          } else {
            const trailingSpace = originalSrc.charAt(nodeToUpdate.end - 2) === ' ';
            mods.push({
              insertAt: nodeToUpdate.end - (trailingSpace ? 2 : 1),
              text: [
                nodeToUpdate.properties.length ? ', ' : ' ',
                `${singleUpdate.path}: [${singleUpdate.action.arrayContains}]`,
                !trailingSpace ? ' ' : '',
              ].join(''),
            });
          }
          break;
        } else {
          throw new Error(`Unable to insert new array at path ${singleUpdate.path}`);
        }
      }

      if (pathNodeToUpdate.type !== 'Property') {
        throw new Error('node to update is not an object property');
      } else if (pathNodeToUpdate.value.type !== 'ArrayExpression') {
        throw new Error('node property value is not an array');
      }

      const arrayItems = pathNodeToUpdate.value.elements;
      let itemFound = false;
      for (const arrayItem of pathNodeToUpdate.value.elements) {
        if (!arrayItem) continue;
        const itemStr = originalSrc.substring(arrayItem.start, arrayItem.end);

        // we use startWith instead of === so that it handles things like `somePlugin() as AstroPlugin`
        // not at all perfect, but an edge case we are seeing internally... will make it more robust eventually
        if (itemStr.startsWith(singleUpdate.action.arrayContains)) {
          itemFound = true;
          break;
        }
      }

      if (itemFound) {
        break;
      } else {
        const isMultiLine = originalSrc.substring(pathNodeToUpdate.value.start, pathNodeToUpdate.value.end).includes('\n');

        mods.push({
          insertAt: pathNodeToUpdate.value.start + 1,
          text:
            // TODO: handle empty array
            // TODO: better handling of indents / line breaks too, single line arrays
            (isMultiLine ? '\n    ' : '')
            + singleUpdate.action.arrayContains
            + (arrayItems.length ? (isMultiLine ? ',' : ', ') : ''),
        });
      }

    // this action will wrap the node with a function call ex: `wrapWithCode(NODE)`
    } else if ('wrapWithFn' in singleUpdate.action) {
      let wrapFnOnly = singleUpdate.action.wrapWithFn;
      if (wrapFnOnly.endsWith('()')) wrapFnOnly = wrapFnOnly.replace('()', '');
      // naively just check if the fn is anywhere within the code
      // eventually we'll want to be smarter but we'll potentially need to walk a tree of wrapped fn calls
      if (originalSrc.substring(nodeToUpdate.start, nodeToUpdate.end).includes(wrapFnOnly)) {
        break;
      }
      mods.push(
        {
          insertAt: nodeToUpdate.start,
          text: `${singleUpdate.action.wrapWithFn}(`,
        },
        {
          insertAt: nodeToUpdate.end,
          text: ')',
        },
      );
    } else if ('addComment' in singleUpdate.action) {
      let commentText = singleUpdate.action.addComment;
      commentText = '\n' + commentText.split('\n').map((c) => `// ${c}`).join('\n') + '\n\n';
      if (!originalSrc.includes(commentText)) {
        const insertCommentAt = originalSrc.lastIndexOf('\n', nodeToUpdate.start - 1);
        mods.push({
          insertAt: insertCommentAt,
          text: commentText,
        });
      }
    }
  }

  let updatedSrc = originalSrc;
  let insertedChars = 0;
  for (const singleMod of mods) {
    updatedSrc = stringInsert(insertedChars + singleMod.insertAt, updatedSrc, singleMod.text);
    insertedChars += singleMod.text.length;
  }

  return updatedSrc;
}


