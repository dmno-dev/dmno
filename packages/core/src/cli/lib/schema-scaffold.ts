import fs from 'node:fs';
import _ from 'lodash-es';
import { fdir } from 'fdir';
import { LoadedDotEnvFile } from '../../lib/dotenv-utils';
import { joinAndCompact } from './formatting';
import { asyncEachLimit } from '../../lib/async-utils';

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

export async function inferDmnoSchema(
  dotEnvFiles: Array<LoadedDotEnvFile>,
  envVarsFromCode: EnvVarsFromCode,
  publicPrefixes?: Array<string>,
) {
  const dmnoSchema: DmnoConfigScaffold = {};

  for (const dotEnvFile of dotEnvFiles) {
    for (const itemKey in dotEnvFile.items) {
      const dotEnvItem = dotEnvFile.items[itemKey];

      const itemHasPublicPrefix = _.some(publicPrefixes, (prefix) => itemKey.startsWith(prefix));

      dmnoSchema[itemKey] ||= {
        // we default everything is sensitive, and can then undo it later
        ...!itemHasPublicPrefix && { sensitive: true },
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
  for (const varKey in envVarsFromCode) {
    // TODO: we could think about inferring static/dynamic based on whether it came from process.env or import.meta
    // and also sensitivity based on public prefixes for the service's integration (ie NEXT_PUBLIC_...)
    dmnoSchema[varKey] ||= {};
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



const ENV_VAR_REGEX = /(process\.env|import\.meta\.env)\.([A-Za-z_][A-Za-z0-9_$]*)/g;

type EnvVarsFromCode = Record<string, Record<string, boolean>>;
// ex: { SOME_VAR: { 'process.env': true } }
export async function findEnvVarsInCode(dirPath: string) {
  // TODO: we may want to prompt the user instead
  // and eventually we may need to detect env var usage in other languages
  const fileExtensions = [
    'ts', 'mts', 'cts', 'tsx',
    'js', 'mjs', 'cjs', 'jsx',
    'mdx', 'astro', 'vue', 'svelte',
  ];
  const filesToSearch = await (
    new fdir() // eslint-disable-line new-cap
      .withBasePath()
      .glob(`**/*.{${fileExtensions.join(',')}}`)
      .exclude((dirName, _dirPath) => {
        // this helps speed things up since it stops recursing into these directories
        // we could skip folders that are gitignored?
        return (
          dirName === 'node_modules'
          || dirName === '.dmno'
          // || dirName === 'dist'
          // || dirName === '.next'
        );
      })
      .crawl(dirPath)
      .withPromise()
  );

  const envVars: EnvVarsFromCode = {};
  await asyncEachLimit(filesToSearch, async (filePath) => {
    try {
      const fileStat = await fs.promises.stat(filePath);
      // we'll skip scanning files over 500kb for now... can probably even turn that way down
      if (fileStat.size > 500 * 1000) return;

      const contents = await fs.promises.readFile(filePath, 'utf-8');
      const matches = contents.matchAll(ENV_VAR_REGEX);
      if (!matches) return;

      Array.from(matches).forEach((match) => {
        const [_matchedString, globalName, varName] = match;
        envVars[varName] ||= {};
        envVars[varName][globalName] = true;
      });
    } catch (err) {
      // fail silently for now
      // console.log(err);
    }
  }, 10); // we'll do 10 files at a time, maybe could be higher?
  return envVars;
}

