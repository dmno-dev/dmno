import fs from 'node:fs';
import * as acorn from 'acorn';
import tsPlugin from 'acorn-typescript';
import { stringInsert } from './string-utils';


type ConfigFileUpdateActions = { arrayContains: string };


export function updateConfigFile(filePath: string, opts: {
  imports: Array<{
    moduleName: string,
    importDefaultAs?: string,
    importVars?: Array<string>;
  }>,
  updates: Array<{
    // so far, we only need to modify the default export, but we may need other options
    symbol: 'EXPORT',
    path: Array<string>,
    action: ConfigFileUpdateActions,
  }>
}) {
  const mods: Array<{ insertAt: number, text: string }> = [];

  const rawConfigFile = fs.readFileSync(filePath).toString();
  // @ts-ignore
  const ast = acorn.Parser.extend(tsPlugin()).parse(rawConfigFile, { sourceType: 'module', ecmaVersion: 'latest', locations: true });
  console.dir(ast, { depth: null });

  const importNodes: Array<acorn.ImportDeclaration> = ast.body.filter((n) => n.type === 'ImportDeclaration') as any;

  // determine existing style of quotes / semicolons
  const q = importNodes[0].source.raw?.endsWith('"') ? '"' : "'";
  const semi = (!importNodes.length || rawConfigFile.substr(importNodes[0].end - 1, 1) === ';') ? ';' : '';

  for (const singleImport of opts.imports) {
    const { moduleName, importDefaultAs, importVars } = singleImport;
    // first see if the file is already imported
    const existingImportNode = importNodes.find((n) => n.source.value === moduleName);
    if (existingImportNode) {
      console.log('import already exists!');
      // here we could edit the exiting import, but for now we'll assume that if the import exists
      // then the user already knows what they are doing

      // we may also need to know what vars/names they imported
    } else {
      // we'll insert our import as the last one before any local files
      const lastModuleImportNode = importNodes.findLast((n) => {
        const importedStr = n.source.value as string;
        return !importedStr.startsWith('./') && !importedStr.startsWith('../');
      });

      mods.push({
        // if no imports, we could potentially find the last comment or something?
        insertAt: lastModuleImportNode?.end || 0,
        text:
          /* eslint-disable no-nested-ternary, prefer-template */
          '\nimport '
            + (importDefaultAs || '')
            + ((importDefaultAs && importVars?.length) ? ', ' : '')
            + (importVars?.length ? `{ ${importVars?.join(', ')} }` : '')
            + ((importDefaultAs || importVars?.length) ? ' from ' : '')
            + `${q}${moduleName}${q}${semi}`
        ,
      });
    }
  }

  for (const singleUpdate of opts.updates) {
    if (singleUpdate.symbol === 'EXPORT') {
      const exportDefaultNode: acorn.ExportDefaultDeclaration = ast.body.find((n) => n.type === 'ExportDefaultDeclaration') as any;
      let objectNode: acorn.ObjectExpression;
      if (exportDefaultNode.declaration.type === 'CallExpression') {
        objectNode = exportDefaultNode.declaration.arguments[0] as any;
      } else {
        throw new Error('only support objects for now');
      }

      // currently only supports path of depth 1, but should support going deeper
      const nodeToUpdate = objectNode.properties.find((n) => n.type === 'Property' && (n.key as any).name === singleUpdate.path[0]);
      if (!nodeToUpdate) {
        throw new Error('Could not find path -' + singleUpdate.path.join('.'));
      }
      if (nodeToUpdate.type !== 'Property') {
        throw new Error('Node is not a property');
      }
      console.log(nodeToUpdate);

      if ('arrayContains' in singleUpdate.action) {
        if (nodeToUpdate.value.type !== 'ArrayExpression') {
          throw new Error('node to update is not an array');
        }

        const arrayItems = nodeToUpdate.value.elements;
        let itemFound = false;
        for (const arrayItem of nodeToUpdate.value.elements) {
          if (!arrayItem) continue;
          const itemStr = rawConfigFile.substring(arrayItem.start, arrayItem.end);
          if (itemStr === singleUpdate.action.arrayContains) {
            itemFound = true;
            break;
          }
        }

        if (itemFound) {
          break;
        } else {
          mods.push({
            insertAt: nodeToUpdate.value.start + 1,
            text:
              // TODO: would be nice to figure out indents / line breaks too
              '\n    '
              + singleUpdate.action.arrayContains
              + (arrayItems.length ? ', ' : ''),
          });
        }


        // singleUpdate.action.arrayContains
      }
    }
  }

  let updatedSrc = rawConfigFile;
  let insertedChars = 0;
  for (const singleMod of mods) {
    updatedSrc = stringInsert(insertedChars + singleMod.insertAt, updatedSrc, singleMod.text);
    insertedChars += singleMod.text.length;
  }

  console.log(updatedSrc);

  return updatedSrc;
}

updateConfigFile(
  '/Users/theo/dmno/dmno-monorepo/example-repo/packages/astro-web/astro.config.ts',
  {
    imports: [{
      moduleName: '@dmno/astro-integration',
      importDefaultAs: 'dmnoAstroIntegration',
    }],
    updates: [{
      symbol: 'EXPORT',
      path: ['integrations'],
      action: {
        arrayContains: 'dmnoAstroIntegration()',
      },
    }],
  },
);


updateConfigFile(
  '/Users/theo/dmno/dmno-monorepo/example-repo/packages/webapp/vite.config.ts',
  {
    imports: [{
      moduleName: '@dmno/vite-integration',
      importVars: ['injectDmnoConfigVitePlugin'],
    }],
    updates: [{
      symbol: 'EXPORT',
      path: ['plugins'],
      action: {
        arrayContains: 'injectDmnoConfigVitePlugin()',
      },
    }],
  },
);


