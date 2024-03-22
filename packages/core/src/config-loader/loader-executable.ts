/**
 * This is the entry point for the config loader process.
 * **It must be run via `tsup`**, so that we can import each `.dmno/config.mts` file dynamically
 *
 * It's reponsible for:
 * - determining where all our services are
 * - loading each service config (or only loading some of it depending on what is needed)
 * - responding to queries from the cli (ex: get all the config for service X)
 *
 * In the future, when we have more of "dev" mode, it will probably also be responsible for
 * watching the config files for changes, and then reloading them and firing off updates to the CLI
 */

import { execSync } from 'node:child_process';
import _ from 'lodash-es';

import ipc from 'node-ipc';
import Debug from 'debug';
import kleur from 'kleur';

import { createServer, Plugin } from 'vite';
import { ViteNodeServer } from 'vite-node/server';
import { ViteNodeRunner } from 'vite-node/client';
import { installSourcemapsSupport } from 'vite-node/source-map';

import {
  DmnoConfigItem, DmnoPickedConfigItem, DmnoService, DmnoWorkspace, ServiceConfigSchema,
} from '../config-engine/config-engine';

import { ConfigLoaderRequestMap } from './ipc-requests';
import { generateTypescriptTypes } from '../config-engine/type-generation';
import { SerializedConfigItem } from './serialization-types';
import { finishPluginRegistration, startPluginRegistration } from '../config-engine/plugins';
import { ConfigLoadError } from '../config-engine/errors';


const debug = Debug('dmno');

let devMode = false;


const CWD = process.cwd();
const thisFilePath = import.meta.url.replace(/^file:\/\//, '');

// console.log({
//   cwd: process.cwd(),
//   // __dirname,
//   'import.meta.url': import.meta.url,
//   thisFilePath,
//   'process.env.PNPM_PACKAGE_NAME': process.env.PNPM_PACKAGE_NAME,
// });

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



const customPlugin: Plugin = {
  name: 'dmno-loader-executable-plugin',

  // THIS IS IMPORTANT - it forces our @dmno/core code to be "externalized" rather than bundled
  // otherwise we end up not loading the same code here in this file as within the config files
  // meaning we have 2 copies of classes and `instanceof` stops working
  enforce: 'pre', // Run before the builtin 'vite:resolve' of Vite
  async resolveId(source, importer, options) {
    // console.log(kleur.bgCyan('PLUGIN RESOLVE!'), source, importer, options);

    if (source === '@dmno/core') {
      // const resolution = await this.resolve(source, importer, options);
      // console.log('resolution', resolution);
      // if (!resolution) return;

      return {
        // pointing at dist/index is hard-coded...
        // we could extract the main entry point from the resolution instead?
        id: '/node_modules/@dmno/core/dist/index.mjs',
        // I believe this path is appended to our "root" which is our workpace root
      };
    }
  },
  async handleHotUpdate(ctx) {
    if (!devMode) return;
    // console.log('hot update!', ctx);
    const startReloadAt = new Date();

    // clear updated modules out of the cache
    ctx.modules.forEach((m) => {
      if (m.id) runner.moduleCache.deleteByModuleId(m.id);
    });

    // naively re-trigger a full reload
    // we could be way smarter and try to patch only the changed stuff back in place
    // but it seems SUPER fast since everything is cached... so why bother
    await reloadAllConfig();

    const endReloadAt = new Date();

    console.log(kleur.yellow(`Reload took ${endReloadAt.getTime() - startReloadAt.getTime()}ms`));
  },
};

// create vite server
const server = await createServer({
  root: WORKSPACE_ROOT_PATH,
  optimizeDeps: {
    // It's recommended to disable deps optimization
    disabled: true,
  },
  appType: 'custom',
  clearScreen: false,

  plugins: [
    customPlugin,
  ],

  // if the folder we are running in has its own vite.config file, it will try to use it
  // passing false here tells it to skip that process
  configFile: false,
  build: {
    // target: 'esnext',
    // rollupOptions: {
    //   external: '@dmno/core',
    // },
    //     // external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
    //   },
    // ssr: true,
  },
});
// console.log(server.config);

// this is need to initialize the plugins
await server.pluginContainer.buildStart({});

// create vite-node server
const node = new ViteNodeServer(server, {
  // debug: {
  //   dumpModules: true,
  // },
});


// fixes stacktraces in Errors
installSourcemapsSupport({
  getSourceMap: (source) => node.getSourceMap(source),
});

// create vite-node runner
const runner = new ViteNodeRunner({
  debug: true,
  root: server.config.root,
  base: server.config.base,
  // when having the server and runner in a different context,
  // you will need to handle the communication between them
  // and pass to this function
  async fetchModule(id) {
    // console.log('fetch module', id);
    return node.fetchModule(id);
  },
  async resolveId(id, importer) {
    // console.log('resolve id', id, importer);
    return node.resolveId(id, importer);
  },
});

// This can be used to test if we are importing @dmno/core correctly
// const testImport = await runner.executeFile('/Users/theo/dmno/core/example-repo/packages/webapp/.dmno/test.mts');
// console.log(testImport.DmnoService === DmnoService);
// process.exit(0);


// const ipc = new Nodeipc.IPC();
ipc.config.id = 'dmno';
ipc.config.retry = 1500;
ipc.config.silent = true;

const requestHandlers = {} as Record<keyof ConfigLoaderRequestMap, any>;
function registerRequestHandler<K extends keyof ConfigLoaderRequestMap>(
  requestType: K,
  handler: (payload: ConfigLoaderRequestMap[K]['payload']) => Promise<ConfigLoaderRequestMap[K]['response']>,
) {
  // console.log(`registered handler for requestType: ${requestType}`);
  if (requestHandlers[requestType]) {
    throw new Error(`Duplicate IPC request handler detected for requestType "${requestType}"`);
  }
  requestHandlers[requestType] = handler;
}

// we pass in a uuid to identify the running process IPC socket
// this allows us to run multiple concurrent loaders...
// TBD whether that makes sense or if we should share a single process?
const processUuid = process.argv[2];
if (!processUuid) {
  throw new Error('Missing process IPC UUID');
}

ipc.connectTo('dmno', `/tmp/${processUuid}.dmno.sock`, function () {
  ipc.of.dmno.on('connect', function () {
    ipc.log('## connected to dmno ##', ipc.config.retry);
  });

  ipc.of.dmno.on('disconnect', function () {
    ipc.log('disconnected from dmno');
  });

  ipc.of.dmno.on(
    'message', // any event or message type your server listens for
    function (data) {
      ipc.log('got a message from dmno : ', data);
    },
  );

  ipc.of.dmno.on('request', async (message: any) => {
    const handler = (requestHandlers as any)[message.requestType];
    if (!handler) {
      throw new Error(`No handler for request type: ${message.requestType}`);
    }
    const result = await handler(message.payload);
    ipc.of.dmno.emit('request-response', {
      requestId: message.requestId,
      response: result,
    });
  });
});


let dmnoWorkspace: DmnoWorkspace;

async function reloadAllConfig() {
  dmnoWorkspace = new DmnoWorkspace();

  // TODO: we may want to set up an initial sort of the services so at least root is first?
  for (const w of workspacePackagesData) {
    const isRoot = w.name === workspaceRootEntry.name;
    // not sure yet about naming the root file differently?
    // especially in the 1 service context, it may feel odd
    // const configFilePath = `${w.path}/.dmno/${isRoot ? 'workspace-' : ''}config.mts`;
    const configFilePath = `${w.path}/.dmno/config.mts`;
    // TODO: do we want to allow .ts or .js too?
    // having some issues when mixing esm with non-esm code in TSX...
    // if (!fs.existsSync(configFilePath)) {
    //   configFilePath = configFilePath.replace(/\.mts$/, '.ts');
    // }

    const serviceInitOpts = {
      isRoot,
      packageName: w.name,
      path: w.path,
      workspace: dmnoWorkspace,
    };

    let service: DmnoService;
    try {
      const plugins = startPluginRegistration(isRoot);

      // node-vite runs the file and returns the loaded module
      const importedConfig = await runner.executeFile(configFilePath);

      finishPluginRegistration();

      service = new DmnoService({
        ...serviceInitOpts,
        // TODO: check if the config file actually exported the right thing and throw helpful error otherwise
        rawConfig: importedConfig.default as ServiceConfigSchema,
        plugins,
      });
    } catch (err) {
      debug('found error when loading config');
      service = new DmnoService({
        ...serviceInitOpts,
        rawConfig: new ConfigLoadError(err as Error),
      });
    }
    dmnoWorkspace.addService(service);
    debug('init service', service);
  }

  dmnoWorkspace.initServicesDag();
  dmnoWorkspace.processConfig();
  await dmnoWorkspace.resolveConfig();
}

registerRequestHandler('load-full-schema', async (_payload) => {
  return dmnoWorkspace.toJSON();
});



registerRequestHandler('get-resolved-config', async (payload) => {
  const service = dmnoWorkspace.getService(payload);
  if (!service) throw new Error('Unable to select a service');

  return service.toJSON();
});


registerRequestHandler('generate-types', async (payload) => {
  const service = dmnoWorkspace.getService(payload);
  if (!service) throw new Error('Unable to select a service');

  return { tsSrc: generateTypescriptTypes(service) };
});



registerRequestHandler('start-dev-mode', async (_payload) => {
  devMode = true;
  return { success: true };
});



// TODO: we're assuming here that IPC connection is already booted...
// and this should probably happen earlier (before loading/resolving config)

await reloadAllConfig();
ipc.of.dmno.emit('ready');

