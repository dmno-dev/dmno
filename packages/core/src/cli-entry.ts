/**
 * This is the actual cli logic - triggered from cli.ts via tsx
 *
 * much of this will likely get reorganized, but just trying to get things working first
 */
import { execSync } from 'node:child_process';
import _ from 'lodash-es';
import graphlib from '@dagrejs/graphlib';

import {
  DmnoConfigItem, DmnoPickedConfigItem, DmnoService, ServiceConfigSchema,
} from './config-engine';

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
const workspacePackagesData = JSON.parse(workspacePackagesRaw) as Array<PnpmPackageListing>;
// console.log(workspacePackagesData);

type PnpmPackageListing = {
  name: string;
  version: string;
  path: string;
  private: boolean;
};

// workspace root should have the shortest path, since the others will all be nested
const workspaceRootEntry = _.minBy(workspacePackagesData, (w) => w.path.length)!;
const WORKSPACE_ROOT_PATH = workspaceRootEntry.path;
let rootServiceName!: string;

// TODO: we may want to set up an initial sort of the services so at least root is first?
const servicesByName: Record<string, DmnoService> = {};
for (const w of workspacePackagesData) {
  const isRoot = w.name === workspaceRootEntry.name;
  // not sure yet about naming the root file differently?
  // especially in the 1 service context, it may feel odd
  const configFilePath = `${w.path}/.dmno/${isRoot ? 'workspace-' : ''}config.mts`;
  // TODO: do we want to allow .ts or .js too?
  // having some issues when mixing esm with non-esm code in TSX...
  // if (!fs.existsSync(configFilePath)) {
  //   configFilePath = configFilePath.replace(/\.mts$/, '.ts');
  // }

  const serviceInitOpts = {
    isRoot,
    packageName: w.name,
    path: w.path,
  };

  let service: DmnoService;
  try {
    const importedConfig = await import(configFilePath);
    service = new DmnoService({
      ...serviceInitOpts,
      // TODO: check if the config file actually exported the right thing and throw helpful error otherwise
      rawConfig: importedConfig.default as ServiceConfigSchema,
    });
  } catch (err) {
    console.log('found error when loading config');
    service = new DmnoService({
      ...serviceInitOpts,
      rawConfig: err as Error,
    });
  }
  if (isRoot) {
    rootServiceName = service.serviceName;
  }

  console.log('init service', service);

  if (servicesByName[service.serviceName]) {
    throw new Error(`Service names must be unique - duplicate name detected "${service.serviceName}"`);
  } else {
    servicesByName[service.serviceName] = service;
  }
}

const services = _.values(servicesByName);

// initialize a services DAG
// note - we may want to experiment with "compound nodes" to have the services contain their config items as children?
const servicesDag = new graphlib.Graph({ directed: true });
for (const service of services) {
  servicesDag.setNode(service.serviceName, { /* can add more metadata here */ });
}

// first set up graph edges based on "parent"
for (const service of services) {
  // check if parent service is valid
  const parentServiceName = service.rawConfig?.parent;
  if (parentServiceName) {
    if (!servicesByName[parentServiceName]) {
      service.schemaErrors.push(new Error(`Unable to find parent service "${parentServiceName}"`));
    } else if (parentServiceName === service.serviceName) {
      service.schemaErrors.push(new Error('Cannot set parent to self'));
    } else {
      // creates a directed edge from parent to child
      servicesDag.setEdge(parentServiceName, service.serviceName, { type: 'parent' });
    }

  // anything without an explicit parent set is a child of the root
  } else if (!service.isRoot) {
    servicesDag.setEdge(rootServiceName, service.serviceName, { type: 'parent' });
  }
}

// add graph edges based on "pick"
// we will not process individual items yet, but this will give us a DAG of service dependencies
for (const service of services) {
  _.each(service.rawConfig?.pick, (rawPick) => {
    // pick defaults to picking from "root" unless otherwise specified
    const pickFromServiceName = _.isString(rawPick) ? rootServiceName : (rawPick.source || rootServiceName);
    if (!servicesByName[pickFromServiceName]) {
      service.schemaErrors.push(new Error(`Invalid service name in "pick" config - "${pickFromServiceName}"`));
    } else if (pickFromServiceName === service.serviceName) {
      service.schemaErrors.push(new Error('Cannot "pick" from self'));
    } else {
      // create directed edge from service output feeding into this one (ex: database feeeds DB_URL into api )
      servicesDag.setEdge(pickFromServiceName, service.serviceName, { type: 'pick' });
    }
  });
}

// look for cycles in the services graph, add schema errors if present
const graphCycles = graphlib.alg.findCycles(servicesDag);
_.each(graphCycles, (cycleMemberNames) => {
  // each cycle is just an array of node names in the cycle
  _.each(cycleMemberNames, (name) => {
    servicesByName[name].schemaErrors.push(new Error(`Detected service dependency cycle - ${cycleMemberNames.join(' + ')}`));
  });
});

// if no cycles were found in the services graph, we use a topological sort to get the right order to continue loading config
let sortedServices = services;
if (!graphCycles.length) {
  const sortedServiceNames = graphlib.alg.topsort(servicesDag);
  sortedServices = _.map(sortedServiceNames, (serviceName) => servicesByName[serviceName]);
  console.log('DEP SORTED SERVICES', sortedServiceNames);
}

for (const service of sortedServices) {
  const ancestorServiceNames = servicesDag.predecessors(service.serviceName) || [];

  // process "picked" items
  for (const rawPickItem of service.rawConfig?.pick || []) {
    const pickFromServiceName = _.isString(rawPickItem) ? rootServiceName : (rawPickItem.source || rootServiceName);
    const isPickingFromAncestor = ancestorServiceNames.includes(pickFromServiceName);
    const rawPickKey = _.isString(rawPickItem) ? rawPickItem : rawPickItem.key;
    const pickFromService = servicesByName[pickFromServiceName];
    if (!pickFromService) {
      // NOTE: we've already added a schema error if item is picking from an non-existant service (above)
      // so we can just bail on this item
      continue;
    }

    // first we'll gather a list of the possible keys we can pick from
    // when picking from an ancestor, we pick from all config items
    // while non-ancestors expose only items that have `expose: true` set on them
    const potentialKeysToPickFrom: Array<string> = [];

    if (isPickingFromAncestor) {
      potentialKeysToPickFrom.push(..._.keys(pickFromService.config));
    } else {
      // whereas only "exposed" items can be picked from non-ancestors
      const exposedItems = _.pickBy(pickFromService.config, (itemConfig) => !!itemConfig.expose);
      potentialKeysToPickFrom.push(..._.keys(exposedItems));
    }

    const keysToPick: Array<string> = [];

    // if key is a string or array of strings, we'll need to check they are valid
    if (_.isString(rawPickKey) || _.isArray(rawPickKey)) {
      for (const keyToCheck of _.castArray(rawPickKey)) {
        if (!potentialKeysToPickFrom.includes(keyToCheck)) {
          // TODO: we could include if the key exists but is not marked to "expose"?
          service.schemaErrors.push(new Error(`Picked item ${pickFromServiceName}/${keyToCheck} was not found`));
        } else {
          keysToPick.push(keyToCheck);
        }
      }

    // if it's a function, we'll be filtering from the list of potential items
    } else if (_.isFunction(rawPickKey)) { // fn that filters keys
      // when picking from an ancestor, we filter all items
      // otherwise, we only filter from outputs
      const pickKeysViaFilter = _.filter(potentialKeysToPickFrom, rawPickKey);

      // we probably want to warn the user if the filter selected nothing?
      if (!pickKeysViaFilter.length) {
        // TODO: we may want to mark this error as a "warning" or something?
        // or some other way of configuring / ignoring
        service.schemaErrors.push(new Error(`Pick from ${pickFromServiceName} using key filter fn had no matches`));
      } else {
        keysToPick.push(...pickKeysViaFilter);
        // console.log('pick keys by filter', pickKeysViaFilter);
      }
    }

    for (let i = 0; i < keysToPick.length; i++) {
      const pickKey = keysToPick[i];
      // deal with key renaming
      let newKeyName = pickKey;
      if (!_.isString(rawPickItem) && rawPickItem.renameKey) {
        // renameKey can be a static string (if dealing with a single key)
        if (_.isString(rawPickItem.renameKey)) {
          // deal with the case of trying to rename multiple keys to a single value
          // TODO: might be able to discourage this in the TS typing?
          if (keysToPick.length > 1) {
            // add an error (once)
            if (i === 0) {
              service.schemaErrors.push(new Error(`Picked multiple keys from ${pickFromServiceName} using static rename`));
            }
            // add an index suffix... so the items will at least still appear
            newKeyName = `${rawPickItem.renameKey}-${i}`;
          } else {
            newKeyName = rawPickItem.renameKey;
          }

        // or a function to transform the existing key
        } else {
          newKeyName = rawPickItem.renameKey(pickKey);
        }
      }

      service.addConfigItem(new DmnoPickedConfigItem(newKeyName, {
        sourceItem: pickFromService.config[pickKey],
        transformValue: _.isString(rawPickItem) ? undefined : rawPickItem.transformValue,
      }));
      // TODO: add to dag node with link to source item
    }
  }

  // process the regular config schema items
  for (const itemKey in service.rawConfig?.schema) {
    // TODO: `!` is needed here - tsup gives an error, while VScode is not...
    const itemDef = service.rawConfig?.schema[itemKey];
    // service.
    service.addConfigItem(new DmnoConfigItem(itemKey, itemDef));
    // TODO: add dag node
  }
}

for (const service of sortedServices) {
  if (service.schemaErrors.length) {
    console.log(`SERVICE ${service.serviceName} has schema errors: `);
    console.log(service.schemaErrors);
  } else {
    await service.resolveConfig();
  }
}

// console.log(sortedServices);

// console.log(services);
