import fs from 'node:fs';
import path from 'node:path';
import _ from 'lodash-es';


// original from dotenv
// const DOTENV_LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(#.*)?(?:$|$)/mg;

import { fdir } from 'fdir';
import { asyncMap } from 'modern-async';
import { checkIsFileGitIgnored } from './git-utils';

// altered slightly from dotenv to capture trailing comments and handle newlines differently
const DOTENV_LINE = /(?:^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?[^\S\r\n]*(#.*)?(?:$)/mg;



export type DotEnvSchemaItem = {
  key: string,
  value: string,
  preComment?: string,
  postComment?: string,
};

export function parseDotEnvContents(dotEnvStr: string) {
  // Convert line breaks to same format
  dotEnvStr = dotEnvStr.replace(/\r\n?/mg, '\n');

  // let match = DOTENV_LINE.exec(dotEnvStr);
  // let inMultiLineValue = false;
  let preComments: Array<string> = [];

  const dotenvItems: Array<DotEnvSchemaItem> = [];

  while (dotEnvStr) {
    let nextEndLineLoc = dotEnvStr.indexOf('\n');
    if (nextEndLineLoc === -1) nextEndLineLoc = dotEnvStr.length;

    // if line is blank, we reset any accumulating comments
    if (!dotEnvStr.substring(0, nextEndLineLoc).trim()) {
      preComments = [];
      dotEnvStr = dotEnvStr.substring(nextEndLineLoc + 1);
      continue;
    }

    if (dotEnvStr.startsWith('#')) {
      const commentLineContent = dotEnvStr.substring(1, nextEndLineLoc);

      // if it looks like a commented out item rather than an actual comment, we'll just ignore the line
      if (commentLineContent.match(DOTENV_LINE)) {
        preComments = [];
      } else {
        preComments.push(commentLineContent);
      }
      dotEnvStr = dotEnvStr.substring(nextEndLineLoc + 1);
      continue;
    }

    const match = DOTENV_LINE.exec(dotEnvStr);
    if (!match) break;

    // trim down the string and reset the regex
    dotEnvStr = dotEnvStr.substring(match.index + match[0].length);
    DOTENV_LINE.lastIndex = 0;

    const key = match[1];

    // Default undefined or null to empty string
    let value = (match[2] || '');
    // Remove whitespace
    value = value.trim();
    // Check if double quoted
    const maybeQuote = value[0];
    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2');
    // Expand newlines if double quoted
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, '\n');
      value = value.replace(/\\r/g, '\r');
    }

    const postComment = match[3]?.substring(1);

    dotenvItems.push({
      key,
      value,
      preComment: preComments.join('\n')?.trim() || undefined,
      postComment: postComment?.trim(),
    });
    preComments = [];
  }
  return dotenvItems;
}

export function loadDotEnvIntoObject(dotEnvStr: string) {
  const dotenvItems = parseDotEnvContents(dotEnvStr);
  const obj: Record<string, string> = {};
  for (const i of dotenvItems) {
    obj[i.key] = i.value;
  }
  return obj;
}





async function loadDotEnvFile(basePath: string, relativePath: string) {
  const fileName = relativePath.split('/').pop();
  const filePath = path.resolve(basePath, relativePath);
  if (!fileName) throw new Error(`Invalid filePath - ${filePath}`);
  if (!fileName.startsWith('.env')) throw new Error('file name must start with ".env"');

  // chop off leading "." and split by "."
  const fileNameParts = fileName.substring(1).split('.');

  const isOverridesFile = ['local', 'override'].includes(fileNameParts[fileNameParts.length - 1]);
  if (isOverridesFile) fileNameParts.pop();

  const isSampleFile = ['sample', 'example'].includes(fileNameParts[fileNameParts.length - 1]);
  if (isSampleFile) fileNameParts.pop();

  if (fileNameParts.length > 2) throw Error(`Unsure how to interpret filename - ${fileName}`);

  let applyForEnv = fileNameParts[1];
  // docker compose gives examples of `.env.dev` and `.env.prod` so we standardize those to normal NODE_ENV values just in case
  if (applyForEnv === 'dev') applyForEnv = 'development';
  if (applyForEnv === 'prod') applyForEnv = 'production';

  const isGitIgnored = await checkIsFileGitIgnored(filePath);

  const rawContents = await fs.promises.readFile(filePath, 'utf8');
  const parsedContents = parseDotEnvContents(rawContents);

  const envObj: Record<string, string> = {};
  for (const i of parsedContents) {
    envObj[i.key] = i.value;
  }
  return {
    path: filePath,
    relativePath,
    fileName,
    isGitIgnored,
    isOverridesFile,
    isSampleFile,
    applyForEnv,
    rawContents,
    parsedContents,
    envObj,
    items: _.keyBy(parsedContents, (i) => i.key) as Record<string, DotEnvSchemaItem>,
  };
}
export type LoadedDotEnvFile = Awaited<ReturnType<typeof loadDotEnvFile>>;

export async function loadServiceDotEnvFiles(
  servicePath: string,
  opts?: {
    onlyLoadDmnoFolder?: boolean,
    excludeDirs?: Array<string>,
  },
): Promise<Array<LoadedDotEnvFile>> {
  let globs = ['**/.env', '**/.env.*', '**/.env.*.local'];
  if (opts?.onlyLoadDmnoFolder) globs = globs.map((p) => p.replace('**/', './.dmno/'));
  const dotEnvFilePaths = await new fdir() // eslint-disable-line new-cap
    .withRelativePaths()
    .glob(...globs)
    .exclude((excludeDirName, exdlueDirPath) => {
      // skip .XXX folders (other than .dmno)
      if (excludeDirName !== '.dmno' && excludeDirName.startsWith('.')) return true;
      // skip node_modules
      if (excludeDirName === 'node_modules') return true;
      // exclude directories - note as passed in, they do not have trailing slashes)
      // but the dirPath does, so we must trailing slash
      if (opts?.excludeDirs?.includes(exdlueDirPath.replace(/\/$/, ''))) return true;
      return false;
    })
    .crawl(servicePath)
    .withPromise();

  const dotEnvFiles = await asyncMap(dotEnvFilePaths, async (relativePath) => {
    return await loadDotEnvFile(servicePath, relativePath);
  });

  const sortedDotEnvFiles = _.sortBy(dotEnvFiles, (d) => {
    if (d.isSampleFile) return 0;
    // .env
    if (!d.isOverridesFile && !d.applyForEnv) return 1;
    // .env.{ENV}
    if (d.applyForEnv && !d.isOverridesFile) return 2;
    // .env.local
    if (!d.applyForEnv && d.isOverridesFile) return 3;
    // .env.{ENV}.local
    if (d.applyForEnv && d.isOverridesFile) return 4;
    throw new Error('unknown type of env file');
  });
  return sortedDotEnvFiles;
}
