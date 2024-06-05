/* eslint-disable no-nested-ternary */

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
  comment?: string,
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
        // some types dont really make sense to ever be sensitive - not sure about other types yet...
        if (['boolean'].includes(inferredType.type)) {
          delete dmnoSchema[itemKey].sensitive;
        }
        if (inferredType.comment) {
          // TODO: we could have multiple kinds of comments (ex: extendsComment) so they go next to the right place
          dmnoSchema[itemKey].comment = inferredType.comment;
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
    const itemHasPublicPrefix = _.some(publicPrefixes, (prefix) => varKey.startsWith(prefix));

    // TODO: we could think about inferring static/dynamic based on whether it came from process.env or import.meta
    // and also sensitivity based on public prefixes for the service's integration (ie NEXT_PUBLIC_...)
    dmnoSchema[varKey] ||= {
      ...!itemHasPublicPrefix && { sensitive: true },
    };
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
      if (propKey === 'comment') {
        itemCode += `  // ${propVal}\n`;
      } else if (propKey === 'extends') {
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


export function generateDmnoConfigInitialCode(opts: {
  isRoot: boolean,
  isMonorepo: boolean,
  serviceName?: string,
  configSchemaScaffold: DmnoConfigScaffold,
}) {
  const schemaConfigAsCode = generateDmnoSchemaCode(opts.configSchemaScaffold);
  const usesSwitchByNodeEnv = schemaConfigAsCode.includes('value: switchByNodeEnv({');
  const dmnoImports = [
    'DmnoBaseTypes',
    'defineDmnoService',
    usesSwitchByNodeEnv && 'switchByNodeEnv',
  ];
  return joinAndCompact([
    `import { ${joinAndCompact(dmnoImports, ', ')} } from 'dmno';`,
    '',
    'export default defineDmnoService({',
    opts.isRoot && '  isRoot: true,',
    opts.serviceName
      ? `  name: '${opts.serviceName}',`
      : (opts.isMonorepo ? '  // no name specified - inherit from package.json' : undefined),
    !opts.isRoot && '  pick: [],',
    '  schema: {',
    ...schemaConfigAsCode.split('\n').map((line) => `    ${line}`),
    '  },',
    '});',
    '',
  ], '\n');
}




type InferredBasicTypes = 'string' | 'number' | 'boolean' | 'email' | 'url';
type InferredTypeSchema = { type: InferredBasicTypes, coercedValue?: any, comment?: string };
// probably should live somewhere else?
const TRUE_VALS = ['true', 't', '1'];
const FALSE_VALS = ['false', 'f', '0'];
const NUMERIC_REGEX = /^-?\d*(\.\d+)?$/;
const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
const URL_REGEX = /(?:^|\s)((https?:\/\/)?(?:localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?)/;
/** fairly naive attempt at inferring some basic types from string values */
export function inferTypeFromEnvStringVal(val: string): InferredTypeSchema {
  if (TRUE_VALS.includes(val.toLowerCase())) {
    return {
      type: 'boolean',
      coercedValue: true,
      ...val === '1' && { comment: 'TODO: review this - value was `1`, so could be number instead of boolean?' },
    };
  }
  if (FALSE_VALS.includes(val.toLowerCase())) {
    return {
      type: 'boolean',
      coercedValue: false,
      ...val === '0' && { comment: 'TODO: review this - value was `0`, so could be number instead of boolean?' },
    };
  }
  if (NUMERIC_REGEX.test(val)) return { type: 'number', coercedValue: parseFloat(val) };
  if (URL_REGEX.test(val)) return { type: 'url' };
  if (EMAIL_REGEX.test(val)) return { type: 'email' };
  return { type: 'string' };
}



const ENV_VAR_REGEX = /(process\.env|import\.meta\.env)\.([A-Za-z_][A-Za-z0-9_$]*)/g;

type EnvVarsFromCode = Record<string, Record<string, boolean>>;
// ex: { SOME_VAR: { 'process.env': true } }
export async function findEnvVarsInCode(
  dirPath: string,
  opts?: {
    excludeDirs?: Array<string>
  },
) {
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
      .exclude((excludeDirName, excludeDirPath) => {
        if (excludeDirName === 'node_modules') return true;
        if (excludeDirName === '.dmno') return true;
        // exclude directories - note as passed in, they do not have trailing slashes)
        // but the dirPath does, so we must trailing slash
        if (opts?.excludeDirs?.includes(excludeDirPath.replace(/\/$/, ''))) return true;
        return false;
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

