import fs from 'node:fs';
import path from 'path';
import { exec } from 'node:child_process';
import { asyncMap } from 'modern-async';
import _ from 'lodash-es';
import { fdir } from 'fdir';
import { outdent } from 'outdent';
import { DotEnvSchemaItem, LoadedDotEnvFile, parseDotEnvContents } from '../../lib/dotenv-utils';
import { checkIsFileGitIgnored } from '../../lib/git-utils';
import { joinAndCompact } from './formatting';


// data structure to store our scaffolded dmno config that will be transformed into actual code
// it will be a subset of our actual config, and we'll need to store the
export type DmnoConfigScaffoldItem = {
  exampleValue?: any,
  description?: string,
  extends?: InferredBasicTypes,
  value?: any,
  valuesForEnv?: Record<string, any>,
  sensitive?: boolean,
};
type DmnoConfigScaffold = Record<string, DmnoConfigScaffoldItem>;


export async function inferDmnoSchema(dotEnvFiles: Array<LoadedDotEnvFile>) {
  const dmnoSchema: DmnoConfigScaffold = {};

  for (const dotEnvFile of dotEnvFiles) {
    for (const itemKey in dotEnvFile.items) {
      const dotEnvItem = dotEnvFile.items[itemKey];
      dmnoSchema[itemKey] ||= {
        // we default everything is sensitive, and can then undo it later
        sensitive: true,
      };

      let coercedItemVal: any | undefined;
      if (
        !dmnoSchema[itemKey].extends
        && dotEnvItem.value !== undefined
        && dotEnvItem.value !== ''
      ) {
        const inferredType = inferTypeFromEnvStringVal(dotEnvItem.value);
        if (inferredType.type !== 'string') dmnoSchema[itemKey].extends = inferredType.type;
        if (inferredType.coercedValue !== undefined) {
          coercedItemVal = inferredType.coercedValue;
        }
      }

      // use comments as description if coming from defaults or sample file
      if (
        (dotEnvItem.preComment || dotEnvItem.postComment)
        && !dotEnvFile.applyForEnv
      ) {
        dmnoSchema[itemKey].description ||= dotEnvItem.preComment || dotEnvItem.postComment;
      }

      // fill in sample value
      if (dotEnvItem.value && dotEnvFile.isSampleFile && !dotEnvFile.applyForEnv) {
        dmnoSchema[itemKey].exampleValue = dotEnvItem.value;
      }

      // put value in the schema if not gitignored
      if (
        dotEnvItem.value !== undefined
        && !dotEnvFile.isSampleFile
        && !dotEnvFile.isGitIgnored
        && !dotEnvFile.isOverridesFile
      ) {
        // we'll assume items with values committed into the repo are not sensitive
        delete dmnoSchema[itemKey].sensitive;

        if (!dotEnvFile.applyForEnv) {
          dmnoSchema[itemKey].value = coercedItemVal ?? dotEnvItem.value;
        } else {
          dmnoSchema[itemKey].valuesForEnv ||= {};
          dmnoSchema[itemKey].valuesForEnv![dotEnvFile.applyForEnv] = coercedItemVal ?? dotEnvItem.value;
        }
      }
    }
  }
  return dmnoSchema;
}
export function generateDmnoSchemaCode(schemaScaffold: DmnoConfigScaffold) {
  const itemsAsCode: Array<string> = [];
  for (const itemKey in schemaScaffold) {
    if (_.isEmpty(schemaScaffold[itemKey])) {
      itemsAsCode.push(`${itemKey}: {},`);
      continue;
    }

    const scaffoldItem = _.cloneDeep(schemaScaffold[itemKey]);
    let itemCode = `${itemKey}: {\n`;

    for (const propKey in scaffoldItem) {
      // skip emitting value if we are going to use a toggle
      if (propKey === 'value' && scaffoldItem.valuesForEnv) continue;
      if (propKey === 'valuesForEnv') continue;
      const propVal = scaffoldItem[propKey as keyof typeof scaffoldItem];
      if (propKey === 'extends') {
        itemCode += `  ${propKey}: DmnoBaseTypes.${propVal},\n`;
      } else {
        itemCode += `  ${propKey}: ${JSON.stringify(propVal)},\n`;
      }
    }

    if (scaffoldItem.valuesForEnv) {
      const switchEntries: Array<string> = [];
      if (scaffoldItem.value !== undefined) {
        switchEntries.push(`_default: ${JSON.stringify(scaffoldItem.value)}`);
      }
      for (const envKey in scaffoldItem.valuesForEnv) {
        switchEntries.push(`${envKey}: ${JSON.stringify(scaffoldItem.valuesForEnv[envKey])}`);
      }
      itemCode += '  value: switchByNodeEnv({\n';
      itemCode += switchEntries.map((switchEntryLine) => `    ${switchEntryLine},\n`).join('');
      itemCode += '  })\n';
    }

    itemCode += '},';
    itemsAsCode.push(itemCode);
  }

  return itemsAsCode.join('\n');
}


export function generateDmnoConfigInitialCode(
  isRoot: boolean,
  serviceName: string,
  configSchemaScaffold: DmnoConfigScaffold,
) {
  const defineFn = isRoot ? 'defineDmnoWorkspace' : 'defineDmnoService';
  const schemaConfigAsCode = generateDmnoSchemaCode(configSchemaScaffold);
  const usesSwitchByNodeEnv = schemaConfigAsCode.includes('value: switchByNodeEnv({');
  const dmnoImports = [
    'DmnoBaseTypes',
    defineFn,
    usesSwitchByNodeEnv && 'switchByNodeEnv',
  ];
  return [
    `import { ${joinAndCompact(dmnoImports, ', ')} } from 'dmno';`,
    '',
    `export default ${defineFn}({`,
    serviceName ? `  name: '${serviceName}',` : '  // no name specified - inherit from package.json',
    isRoot ? undefined : '  pick: [],',
    '  schema: {',
    ...schemaConfigAsCode.split('\n').map((line) => `    ${line}`),
    '  },',
    '});',
    '',
  ].join('\n');
}




type InferredBasicTypes = 'string' | 'number' | 'boolean' | 'email' | 'url';
// probably should live somewhere else?
const TRUE_VALS = ['true', 't', '1'];
const FALSE_VALS = ['true', 't', '1'];
const NUMERIC_REGEX = /^-?\d*(\.\d+)?$/;
const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
const URL_REGEX = /(?:^|\s)((https?:\/\/)?(?:localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?)/;
/** fairly naive attempt at inferring some basic types from string values */
export function inferTypeFromEnvStringVal(val: string): { type: InferredBasicTypes, coercedValue?: any } {
  if (TRUE_VALS.includes(val.toLowerCase())) return { type: 'boolean', coercedValue: true };
  if (FALSE_VALS.includes(val.toLowerCase())) return { type: 'boolean', coercedValue: false };
  if (NUMERIC_REGEX.test(val)) return { type: 'number', coercedValue: parseFloat(val) };
  if (URL_REGEX.test(val)) return { type: 'url' };
  if (EMAIL_REGEX.test(val)) return { type: 'email' };
  return { type: 'string' };
}


