/**
 * This is the actual cli logic - triggered from cli.ts via tsx
 * 
 * much of this will likely get reorganized, but just trying to get things working first
 */
import path from 'node:path';
import fs from 'node:fs';
import _ from 'lodash';
import async from 'async';
import { execSync, exec, spawn } from 'node:child_process';
import { ServiceConfigSchema } from './config-engine';

console.log('>>CLI ENTRY!');

const CWD = process.cwd();
const thisFilePath = import.meta.url.replace(/^file:\/\//, '');

console.log({
  cwd: process.cwd(),
  // __dirname,
  'import.meta.url': import.meta.url,
  thisFilePath,
  'process.env.PNPM_PACKAGE_NAME': process.env.PNPM_PACKAGE_NAME,
});

// currently assuming we are using pnpm, and piggybacking off of their definition of "services" in pnpm-workspace.yaml
// we'll want to to do smarter detection and also support yarn/npm/etc as well as our own list of services defined at the root

// TODO: need smarter detection of pnpm monorepo?
// const IS_PNPM = fs.existsSync(`${CWD}/pnpm-lock.yaml`);
// if (IS_PNPM) console.log('detected pnpm');
// if (!IS_PNPM) throw new Error('Must be run in a pnpm-based monorepo');

// using `pnpm m ls` to list workspace packages
const workspacePackagesRaw = execSync('pnpm m ls --json --depth=-1').toString();
const workspacePackagesData = JSON.parse(workspacePackagesRaw) as PnpmPackageListing[];
console.log(workspacePackagesData);

type PnpmPackageListing = {
  name: string;
  version: string;
  path: string;
  private: boolean;
};

// workspace root should have the shortest path, since the others will all be nested
const workspaceRootEntry = _.minBy(workspacePackagesData, (w) => w.path.length)!;
const WORKSPACE_ROOT_PATH = workspaceRootEntry.path;

type LoadedServiceInfo = {
  /** name of service according to package.json file  */
  packageName: string,
  /** name of service within dmno - pulled from config.ts but defaults to packageName if not provided  */
  serviceName: string,
  /** path to the service itself */
  path: string,
  /** path to .dmno/config.ts file */
  configFilePath: string,
  /** unprocessed config schema pulled from config.ts */
  rawConfig: ServiceConfigSchema,
}

const services: Record<string, LoadedServiceInfo> = {};
for (const w of workspacePackagesData) {
  const isRoot = w.name === workspaceRootEntry.name;
  const configFilePath = `${w.path}/.dmno/${isRoot ? 'workspace-' : ''}config.ts`;
  const importedConfig = await import(configFilePath);

  // TODO: check if the config file actually exported the right thing and throw helpful error otherwise
  const rawConfig = importedConfig.default as ServiceConfigSchema;

  // default to package.json module name, but use name from config.ts if provided
  let serviceName = isRoot ? 'root' : w.name;
  if (!isRoot && rawConfig.name) {
    if (rawConfig.name === 'root') {
      throw new Error('You cannot name a dmno service "root"');
    }
    serviceName = rawConfig.name;
  }
  
  services[serviceName] = {
    serviceName,
    packageName: w.name,
    path: w.path,
    configFilePath,
    rawConfig: importedConfig.default,
  };
};

console.log(services);
