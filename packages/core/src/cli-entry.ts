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
import graphlib from '@dagrejs/graphlib';

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

// TODO: probably change from a type to a class with some helpers
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
  rawConfig?: ServiceConfigSchema,
  /** error encountered while _loading_ the config schema */
  configLoadError?: Error,
  /** error within the schema itself */
  schemaErrors: Error[], // TODO: probably want a specific error type...?
}

const services: LoadedServiceInfo[] = [];
for (const w of workspacePackagesData) {
  const isRoot = w.name === workspaceRootEntry.name;
  // not sure yet about naming the root file differently?
  // especially in the 1 service context, it may feel odd
  const configFilePath = `${w.path}/.dmno/${isRoot ? 'workspace-' : ''}config.ts`;

  // default to package.json module name, but use name from config.ts if provided
  let serviceName = isRoot ? 'root' : w.name;

  try {
    const importedConfig = await import(configFilePath);
    // TODO: check if the config file actually exported the right thing and throw helpful error otherwise
    const rawConfig = importedConfig.default as ServiceConfigSchema;

    // override service name with name from config if one is set
    if (!isRoot && rawConfig.name) {
      if (rawConfig.name === 'root') {
        throw new Error('You cannot explicitly name a dmno service "root" unless it is the project root');
      }
      serviceName = rawConfig.name;
    }

    services.push({
      serviceName,
      packageName: w.name,
      path: w.path,
      configFilePath,
      rawConfig: importedConfig.default,
      schemaErrors: [],
    });

  } catch (err) {
    console.log('found error when loading config');

    // TODO dry this up
    services.push({
      serviceName,
      packageName: w.name,
      path: w.path,
      configFilePath,
      configLoadError: err as Error,
      schemaErrors: [],
    });

  }
};

const servicesByName = _.keyBy(services, (s) => s.serviceName);

// validate schema names are valid (config.parent and config.pick)

// we may want to expirement with "compound nodes" to have the services contain their config items as children?
const servicesDag = new graphlib.Graph({ directed: true });

// create a node for each service
for (const service of services) {
  servicesDag.setNode(service.serviceName, { /* can add more metadata here */ });
}

for (const service of services) {
  // check if parent service is valid
  const parentServiceName = service.rawConfig?.parent;
  if (parentServiceName) {
    if (!servicesByName[parentServiceName]) {
      service.schemaErrors.push(new Error(`Unable to find parent service "${parentServiceName}"`))
    } else if (parentServiceName === service.serviceName) {
      service.schemaErrors.push(new Error(`Cannot set parent to self`));
    } else {
      // creates a directed edge from parent to child
      servicesDag.setEdge(parentServiceName, service.serviceName, { type: 'parent' });
    }
  }
}

// add graph edges based on "pick" - we will not resolve individual items yet
// but this will tell us what order to resolve our services in
for (const service of services) {
  _.each(service.rawConfig?.pick, (rawPick) => {
    // pick defaults to picking from "root" unless otherwise specified
    const pickFromServiceName = _.isString(rawPick) ? 'root' : (rawPick.source || 'root');
    if (!servicesByName[pickFromServiceName]) {
      service.schemaErrors.push(new Error(`Invalid service name in "pick" config - "${pickFromServiceName}"`))
    } else if (pickFromServiceName === service.serviceName) {
        service.schemaErrors.push(new Error(`Cannot "pick" from self`));
    } else {
      // create directed edge from service being "picked" from to this one
      servicesDag.setEdge(pickFromServiceName, service.serviceName, { type: 'pick' });
    }
  });
}

// look for cycles in the services graph
const graphCycles = graphlib.alg.findCycles(servicesDag);
_.each(graphCycles, (cycleMemberNames) => { // can find multiple cycles
  _.each(cycleMemberNames, (name, i) => { // each cycle is just an array of node names in the cycle
    servicesByName[name].schemaErrors.push(new Error(`Detected service dependency cycle - ${cycleMemberNames.join(' + ')}`))
  });
});


console.log(services);
