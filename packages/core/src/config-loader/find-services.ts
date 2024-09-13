import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import _ from 'lodash-es';
import readYamlFile from 'read-yaml-file';
import { fdir } from 'fdir';
import { tryCatch } from '@dmno/ts-lib';
import Debug from 'debug';

const debug = Debug('dmno:find-services');

export async function readJsonFile(path: string) {
  return JSON.parse(await fs.promises.readFile(path, 'utf8'));
}


export type WorkspacePackagesListing = {
  name: string,
  version?: string,
  path: string,
  relativePath: string,
  isRoot: boolean,
  dmnoFolder: boolean,
};
export type ScannedWorkspaceInfo = {
  gitRootPath?: string,
  isMonorepo: boolean,
  workspacePackages: Array<WorkspacePackagesListing>,
  autoSelectedPackage?: WorkspacePackagesListing;
};

export async function pathExists(p: string) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

// list of locations to look for workspace project globs
// TODO: we could add extra conditions so we dont waste time looking for all the files?
const PACKAGE_GLOB_LOCATIONS = [
  // explicit dmno workspace config - this overrides everything else
  { file: '.dmno/dmno-workspace.yaml', path: 'projects', final: true },
  // pnpm config file
  { file: 'pnpm-workspace.yaml', path: 'packages' },
  // moonrepo config file
  { file: '.moon/workspace.yml', path: 'projects' },
  // npm, yarn, bun, deno (supported)
  { file: 'package.json', path: 'workspaces', optional: true },
  // deno also has a deno-specific config file to look in
  // { file: 'deno.json', path: 'workspace', optional: true },
  // { file: 'deno.jsonc', path: 'workspace', optional: true },
];

export async function findDmnoServices(includeUnitialized = true): Promise<ScannedWorkspaceInfo> {
  const startAt = new Date();

  let gitRootPath: string | undefined;
  let dmnoWorkspaceRootPath: string | undefined;
  let dmnoWorkspaceFinal = false;
  let isMonorepo = false;
  let packagePatterns: Array<string> | undefined;


  // we'll scan upwards from cwd until the git root (or we hit `/`)
  let cwd = process.cwd();
  const cwdParts = cwd.split('/');
  while (cwd) {
    debug('scanning CWD = ', cwdParts, cwd);
    // look for workspace package globs in a few locations (see above)
    // and we'll keep scanning upwards, unless we found a `.dmno/dmno-workspace.yaml`
    if (!dmnoWorkspaceFinal) {
      for (const globLocation of PACKAGE_GLOB_LOCATIONS) {
        const filePath = path.join(cwd, globLocation.file);
        if (!await pathExists(filePath)) continue;

        // assume first package.json file found is root until we find evidence otherwise
        if (globLocation.file === 'package.json' && !dmnoWorkspaceRootPath) {
          dmnoWorkspaceRootPath = cwd;
        }

        debug(`looking for workspace globs in ${filePath} > ${globLocation.path}`);
        const fileType = path.extname(filePath);
        let fileContents: any;
        if (fileType === '.yaml' || fileType === '.yml') {
          fileContents = await readYamlFile(filePath);
        } else if (fileType === '.json') {
          fileContents = await readJsonFile(filePath);
        }
        const possiblePackagePatterns = _.get(fileContents, globLocation.path);
        if (possiblePackagePatterns) {
          packagePatterns = possiblePackagePatterns;
          dmnoWorkspaceRootPath = cwd;
          isMonorepo = true;
        } else if (!globLocation.optional) {
          throw new Error(`Expected to find monorepo project glob patterns in file ${fileURLToPath} > ${globLocation.path}`);
        }
        if (globLocation.final) {
          dmnoWorkspaceFinal = true;
          break; // breaks from for loop - will still continue looking for git root
        }
      }
    }

    // check for .git folder to detect git root
    if (await pathExists(path.join(cwd, '.git'))) {
      gitRootPath = cwd;
      // if we hadn't found a dmno workspace root yet, we'll fall back to the git root
      if (!dmnoWorkspaceRootPath) dmnoWorkspaceRootPath = gitRootPath;
      // we stop scanning when we find the git root!
      break;
    }

    // go up one level and continue
    cwdParts.pop();
    cwd = cwdParts.join('/');
  }

  if (!dmnoWorkspaceRootPath) {
    // TODO: add link to docs with more info
    throw new Error('Unable to detect dmno workspace root');
  }


  // const { packageManager, rootWorkspacePath: rootServicePath } = await detectPackageManager();

  let packagePaths = [dmnoWorkspaceRootPath];
  if (isMonorepo && packagePatterns?.length) {
    const fullPackagePatterns = packagePatterns.map((gi) => path.join(dmnoWorkspaceRootPath, gi));
    const packageGlobs = fullPackagePatterns.filter((s) => s.includes('*'));
    const packageDirs = fullPackagePatterns.filter((s) => !s.includes('*'));
    const expandedPathsFromGlobs = await (
      // tried a few different libs here (tiny-glob being the other main contender) and this is WAY faster especially with some tuning :)
      new fdir() // eslint-disable-line new-cap
        .withBasePath()
        .onlyDirs()
        .glob(...packageGlobs)
        .exclude((dirName, _dirPath) => {
          // this helps speed things up since it stops recursing into these directories
          return (
            dirName === 'node_modules'
            // could add more... doesn't seem to make a big difference
            // || dirName === '.dmno'
            // || dirName === 'src'
            // || dirName === 'dist'
            // || dirName === '.next'
          );
        })
        .crawl(dmnoWorkspaceRootPath)
        .withPromise()
    );
    packagePaths.push(...packageDirs);
    packagePaths.push(...expandedPathsFromGlobs);
    packagePaths = packagePaths.map((p) => p.replace(/\/$/, '')); // remove trailing slash
    packagePaths = _.uniq(packagePaths);
  }

  const workspacePackages = _.compact(await Promise.all(packagePaths.map(async (packagePath) => {
    const packageJson = await tryCatch(
      async () => await readJsonFile(path.join(packagePath, 'package.json')),
      (err) => {
        if ((err as any).code === 'ENOENT') return undefined;
        throw err;
      },
    );

    const dmnoFolderExists = await pathExists(path.join(packagePath, '.dmno'));

    // TODO: are there other places we can look for package name?
    const packageName = packageJson?.name || packagePath.split('/').pop();

    return {
      isRoot: packagePath === dmnoWorkspaceRootPath,
      path: packagePath,
      relativePath: packagePath.substring(dmnoWorkspaceRootPath.length + 1),
      name: packageName,
      dmnoFolder: dmnoFolderExists,
    };
  })));

  const packageFromPwd = workspacePackages.find((p) => p.path === process.env.PWD);
  // note - this doesn't play nice if you have duplicate package names in your monorepo...
  // this shouldnt really be an issue, but it's notable
  const packageManagerCurrentPackageName = process.env.npm_package_name || process.env.PNPM_PACKAGE_NAME;
  const packageFromCurrentPackageName = workspacePackages.find((p) => p.name === packageManagerCurrentPackageName);

  debug(`completed scanning in ${+new Date() - +startAt}ms`);

  return {
    gitRootPath,
    isMonorepo,
    workspacePackages: includeUnitialized ? workspacePackages : _.filter(workspacePackages, (p) => p.dmnoFolder),
    autoSelectedPackage: packageFromPwd || packageFromCurrentPackageName,
  };
}
