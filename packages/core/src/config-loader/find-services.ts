import fs from 'node:fs';
import path from 'node:path';
import kleur from 'kleur';
import _ from 'lodash-es';
import async from 'async';
import readYamlFile from 'read-yaml-file';
import { fdir } from 'fdir';
import { tryCatch } from '@dmno/ts-lib';
import Debug from 'debug';

const debug = Debug('dmno:find-services');

async function readJsonFile(path: string) {
  const raw = await fs.promises.readFile(path);
  const obj = JSON.parse(raw.toString());
  return obj;
}

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'moon';
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

export async function pathExists(p: string) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}


export async function findDmnoServices(): Promise<ScannedWorkspaceInfo> {
  const startAt = new Date();
  let cwd = process.cwd();
  debug(`begin scan for services from ${cwd}`);

  const cwdParts = cwd.split('/');

  let packageManager: PackageManager | undefined;
  let possibleRootPackage: string | undefined;

  while (!packageManager) {
    // we could also try to detect the current package manager via env vars (ex: process.env.PNPM_PACKAGE_NAME)
    // and then not check for all of the lockfiles...?

    // TODO: nx and lerna support? (lerna.json has packages array)
    // TODO: deno?

    const filesFound = await async.mapValues({
      packageJson: 'package.json',
      yarnLock: 'yarn.lock',
      npmLock: 'package-lock.json',
      pnpmLock: 'pnpm-lock.yaml',
      pnpmWorkspace: 'pnpm-workspace.yaml',
      bunLock: 'bun.lockb',
      moonWorkspace: '.moon/workspace.yml',
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    }, async (filePath) => pathExists(path.resolve(cwd, filePath)));

    if (filesFound.packageJson) possibleRootPackage = cwd;

    if (filesFound.pnpmLock || filesFound.pnpmWorkspace) packageManager = 'pnpm';
    else if (filesFound.npmLock) packageManager = 'npm';
    else if (filesFound.yarnLock) packageManager = 'yarn';
    else if (filesFound.bunLock) packageManager = 'bun';
    else if (filesFound.moonWorkspace) packageManager = 'moon';

    if (!packageManager) {
      cwdParts.pop();
      cwd = cwdParts.join('/');
    }
    // show some hopefully useful error messaging if we hit the root folder without finding anything
    if (cwd === '') {
      console.log(kleur.red('Unable to find detect your package manager and workspace root!'));
      if (possibleRootPackage) {
        console.log(`But it looks like your workspace root might be\n${kleur.italic(possibleRootPackage)}`);
      }
      console.log('We look for lock files (ex: package-lock.json) so you may just need to run a dependency install');
      process.exit(1);
    }
  }
  const rootServicePath = cwd;

  debug('finished scanning for workspace root', {
    packageManager,
    rootServicePath,
  });


  let packagesGlobs: Array<string> | undefined;
  let isMonorepo = false;

  debug('looking for workspace globs');
  if (packageManager === 'pnpm') {
    // if no pnpm-workspace.yaml exists, it's not a monorepo
    const pnpmWorkspaceYamlPath = `${rootServicePath}/pnpm-workspace.yaml`;
    if (await pathExists(pnpmWorkspaceYamlPath)) {
      const pnpmWorkspacesYaml = await readYamlFile(`${rootServicePath}/pnpm-workspace.yaml`);
      isMonorepo = true;
      packagesGlobs = (pnpmWorkspacesYaml as any).packages;
      debug('looked in pnpm-workspace.yaml for "packages" field');
    } else {
      debug('no pnpm-workspace.yaml found');
    }
  } else if (packageManager === 'yarn' || packageManager === 'npm' || packageManager === 'bun') {
    const rootPackageJson = await readJsonFile(`${rootServicePath}/package.json`);
    if (rootPackageJson.workspaces) {
      isMonorepo = true;
      packagesGlobs = rootPackageJson.workspaces;
    }
    debug('looked in package.json for "workspaces" field');
  } else if (packageManager === 'moon') {
    const moonWorkspacesYaml = await readYamlFile(`${rootServicePath}/.moon/workspace.yml`);
    isMonorepo = true;
    packagesGlobs = (moonWorkspacesYaml as any).projects;
    debug('looked in .moon/workspace.yml for "projects" field');
  }

  // console.log('Package manager = ', packageManager);
  // console.log('workspace root = ', rootServicePath);
  // console.log('is monorepo?', isMonorepo);
  // console.log('packages globs', packagesGlobs);


  const packagePaths = [rootServicePath];
  if (isMonorepo && packagesGlobs?.length) {
    const expandedPathsFromGlobs = await (
      // tried a few different libs here (tiny-glob being the other main contender) and this is WAY faster especially with some tuning :)
      new fdir() // eslint-disable-line new-cap
        .withBasePath()
        .onlyDirs()
        .glob(...packagesGlobs.map((gi) => path.resolve(`${rootServicePath}/${gi}`)))
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
    packagePaths.push(...expandedPathsFromGlobs);
  }

  const workspacePackages = await Promise.all(packagePaths.map(async (packagePath) => {
    const packageJson = await tryCatch(
      async () => await readJsonFile(`${packagePath}/package.json`),
      (_err) => {},
    );

    const dmnoFolderExists = await pathExists(`${packagePath}/.dmno`);

    const fullPath = packagePath.replace(/\/$/, ''); // remove trailing slash
    return {
      isRoot: packagePath === rootServicePath,
      path: fullPath,
      relativePath: fullPath.substring(rootServicePath.length + 1),
      name: packageJson?.name || packagePath.split('/').pop(),
      dmnoFolder: dmnoFolderExists,
    };
  }));



  const packageFromPwd = workspacePackages.find((p) => p.path === process.env.PWD);
  // note - this doesn't play nice if you have duplicate package names in your monorepo...
  // this shouldnt really be an issue, but it's noteable
  const packageManagerCurrentPackageName = process.env.npm_package_name || process.env.PNPM_PACKAGE_NAME;
  const packageFromCurrentPackageName = workspacePackages.find((p) => p.name === packageManagerCurrentPackageName);
  const autoSelectedPackagePath = packageFromPwd?.path || packageFromCurrentPackageName?.path;

  debug(`completed scanning in ${+new Date() - +startAt}ms`);

  return {
    isMonorepo,
    packageManager,
    workspacePackages,
    autoSelectedPackage: packageFromPwd || packageFromCurrentPackageName,
  };
}
