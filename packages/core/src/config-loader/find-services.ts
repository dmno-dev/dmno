import fs from 'node:fs';
import path from 'node:path';
import kleur from 'kleur';
import _ from 'lodash-es';
import readYamlFile from 'read-yaml-file';
import { fdir } from 'fdir';
import { tryCatch } from '@dmno/ts-lib';
import Debug from 'debug';
import { asyncMapValues } from '../lib/async-utils';
import { PackageManager, detectPackageManager } from '../lib/detect-package-manager';

const debug = Debug('dmno:find-services');

export async function readJsonFile<T = any>(path: string) {
  return JSON.parse(await fs.promises.readFile(path, 'utf8')) as T;
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
  isMonorepo: boolean,
  packageManager: PackageManager,
  workspacePackages: Array<WorkspacePackagesListing>,
  autoSelectedPackage?: WorkspacePackagesListing;
};
export type DmnoBuildInfo = {
  isMonorepo: boolean,
  rootService: string,
  selectedService: string,
};

export async function pathExists(p: string) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}


export async function findDmnoServices(includeUnitialized = true): Promise<ScannedWorkspaceInfo> {
  const startAt = new Date();

  const { packageManager, rootWorkspacePath: rootServicePath } = await detectPackageManager();

  let packagePatterns: Array<string> | undefined;
  let isMonorepo = false;

  debug('looking for workspace globs');
  if (packageManager === 'pnpm') {
    // if no pnpm-workspace.yaml exists, it's not a monorepo
    const pnpmWorkspaceYamlPath = `${rootServicePath}/pnpm-workspace.yaml`;
    if (await pathExists(pnpmWorkspaceYamlPath)) {
      const pnpmWorkspacesYaml = await readYamlFile(`${rootServicePath}/pnpm-workspace.yaml`);
      isMonorepo = true;
      packagePatterns = (pnpmWorkspacesYaml as any).packages;
      debug('looked in pnpm-workspace.yaml for "packages" field');
    } else {
      debug('no pnpm-workspace.yaml found');
    }
  } else if (packageManager === 'yarn' || packageManager === 'npm' || packageManager === 'bun') {
    const rootPackageJson = await readJsonFile(`${rootServicePath}/package.json`);
    if (rootPackageJson.workspaces) {
      isMonorepo = true;
      packagePatterns = rootPackageJson.workspaces;
    }
    debug('looked in package.json for "workspaces" field');
  } else if (packageManager === 'moon') {
    const moonWorkspacesYaml = await readYamlFile(`${rootServicePath}/.moon/workspace.yml`);
    isMonorepo = true;
    packagePatterns = (moonWorkspacesYaml as any).projects;
    debug('looked in .moon/workspace.yml for "projects" field');
  }

  // console.log('Package manager = ', packageManager);
  // console.log('workspace root = ', rootServicePath);
  // console.log('is monorepo?', isMonorepo);
  // console.log('packages globs', packagesGlobs);


  let packagePaths = [rootServicePath];
  if (isMonorepo && packagePatterns?.length) {
    const fullPackagePatterns = packagePatterns.map((gi) => path.resolve(`${rootServicePath}/${gi}`));
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
        .crawl(rootServicePath)
        .withPromise()
    );
    packagePaths.push(...packageDirs);
    packagePaths.push(...expandedPathsFromGlobs);
    packagePaths = packagePaths.map((p) => p.replace(/\/$/, '')); // remove trailing slash
    packagePaths = _.uniq(packagePaths);
  }

  const workspacePackages = _.compact(await Promise.all(packagePaths.map(async (packagePath) => {
    const packageJson = await tryCatch(
      async () => await readJsonFile(`${packagePath}/package.json`),
      (err) => {
        // missing package.json, so we'll skip this one
        // currently this is true for a folder containing other packages
        // but eventually for polyglot support we may need some other logic here
        if ((err as any).code === 'ENOENT') {
          return undefined;
        }
        throw err;
      },
    );
    if (!packageJson) return;

    const dmnoFolderExists = await pathExists(`${packagePath}/.dmno`);

    return {
      isRoot: packagePath === rootServicePath,
      path: packagePath,
      relativePath: packagePath.substring(rootServicePath.length + 1),
      name: packageJson?.name || packagePath.split('/').pop(),
      dmnoFolder: dmnoFolderExists,
    };
  })));

  const packageFromPwd = workspacePackages.find((p) => p.path === process.env.PWD);
  // note - this doesn't play nice if you have duplicate package names in your monorepo...
  // this shouldnt really be an issue, but it's noteable
  const packageManagerCurrentPackageName = process.env.npm_package_name || process.env.PNPM_PACKAGE_NAME;
  const packageFromCurrentPackageName = workspacePackages.find((p) => p.name === packageManagerCurrentPackageName);

  debug(`completed scanning in ${+new Date() - +startAt}ms`);

  return {
    isMonorepo,
    packageManager,
    workspacePackages: includeUnitialized ? workspacePackages : _.filter(workspacePackages, (p) => p.dmnoFolder),
    autoSelectedPackage: packageFromPwd || packageFromCurrentPackageName,
  };
}

export async function findDmnoServicesInBuiltMode(): Promise<ScannedWorkspaceInfo> {
  const { packageManager, rootWorkspacePath: rootServicePath } = await detectPackageManager();

  // TODO: probably do something smarter than using PWD? but we still need to get to the built folder
  const pwd = process.env.PWD;
  const dmnoBuildDirPath = `${pwd}/.dmno-built`;
  if (!fs.existsSync(dmnoBuildDirPath)) {
    throw new Error(`DMNO build dir "${dmnoBuildDirPath}" not found. Run \`dmno build\` first.`);
  }

  const dmnoBuildMetadata = await readJsonFile<DmnoBuildInfo>(`${dmnoBuildDirPath}/dmno-build-info.json`);

  const workspacePackages = [] as ScannedWorkspaceInfo['workspacePackages'];

  const dirItems = await fs.promises.readdir(dmnoBuildDirPath, { withFileTypes: true });
  for (const dirItem of dirItems) {
    if (!dirItem.isDirectory()) continue;
    const builtPackagePath = `${dirItem.path}/${dirItem.name}`;
    const packageJson = await tryCatch(
      async () => await readJsonFile(`${builtPackagePath}/package.json`),
      (err) => {
        if ((err as any).code === 'ENOENT') return undefined;
        throw err;
      },
    );


    const serviceName = dirItem.name.replaceAll('__', '/');
    const packageInfo = {
      isRoot: serviceName === dmnoBuildMetadata.rootService,
      dmnoFolder: true,
      path: builtPackagePath,
      // TODO: not sure this is used for anything
      // if we want this relative to the execution context, this is wrong
      relativePath: builtPackagePath.substring(dmnoBuildDirPath.length + 1),
      name: packageJson.name,
    };
    workspacePackages[packageInfo.isRoot ? 'unshift' : 'push'](packageInfo);
  }

  return {
    isMonorepo: true, // built mode currently can only be run in monorepo mode
    packageManager,
    workspacePackages,
  };
}
