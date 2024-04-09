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

import { exec } from 'node:child_process';
import util from 'node:util';
import _ from 'lodash-es';

import ipc from 'node-ipc';
import Debug from 'debug';
import kleur from 'kleur';

import { createServer, Plugin } from 'vite';
import { ViteNodeServer } from 'vite-node/server';
import { ViteNodeRunner } from 'vite-node/client';
import { installSourcemapsSupport } from 'vite-node/source-map';

import { createDeferredPromise } from '@dmno/ts-lib';
import {
  DmnoService, DmnoWorkspace, ServiceConfigSchema,
} from '../config-engine/config-engine';

import { ConfigLoaderRequestMap } from './ipc-requests';
import { generateServiceTypes, generateTypescriptTypes } from '../config-engine/type-generation';
import { finishServiceLoadPlugins, beginServiceLoadPlugins, beginWorkspaceLoadPlugins } from '../config-engine/plugins';
import { ConfigLoadError } from '../config-engine/errors';
import { createDebugTimer } from '../cli/lib/debug-timer';

const execAsync = util.promisify(exec);

const debug = Debug('dmno');
const debugTimer = createDebugTimer('dmno:loader-executable');

const viteServerReadyDeferred = createDeferredPromise();

// const CWD = process.cwd();
// const thisFilePath = import.meta.url.replace(/^file:\/\//, '');

// console.log({
//   cwd: process.cwd(),
//   // __dirname,
//   'import.meta.url': import.meta.url,
//   thisFilePath,
//   'process.env.PNPM_PACKAGE_NAME': process.env.PNPM_PACKAGE_NAME,
// });

debugTimer('begin loader executable');

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


// IPC request handlers ////////////////////////////////////////////////

registerRequestHandler('load-full-schema', async (payload) => {
  if (!schemaLoaded) await reloadAllConfig();
  if (payload?.resolve) await dmnoWorkspace.resolveConfig();
  return dmnoWorkspace.toJSON();
});

registerRequestHandler('get-resolved-config', async (payload) => {
  if (!schemaLoaded) await reloadAllConfig();
  await dmnoWorkspace.resolveConfig();
  const service = dmnoWorkspace.getService(payload);
  if (!service) throw new Error('Unable to select a service');

  return service.toJSON();
});


registerRequestHandler('generate-types', async (payload) => {
  if (!schemaLoaded) await reloadAllConfig();
  const service = dmnoWorkspace.getService(payload);
  if (!service) throw new Error('Unable to select a service');

  return { tsSrc: await generateTypescriptTypes(service) };
});



registerRequestHandler('start-dev-mode', async (_payload) => {
  devMode = true;
  // somewhat wasteful to reload... but this will then trigger some extra behaviour
  // TODO: refactor how dev mode starts and the loading process... probably pass in a dev mode flag on boot
  await reloadAllConfig();
  return { success: true };
});


function initIpcClient() {
  // const ipc = new Nodeipc.IPC();
  ipc.config.id = 'dmno';
  ipc.config.retry = 1500;
  ipc.config.silent = true;

  // we pass in a uuid to identify the running process IPC socket
  // this allows us to run multiple concurrent loaders...
  // TBD whether that makes sense or if we should share a single process?
  const processUuid = process.argv[2];
  if (!processUuid) {
    throw new Error('Missing process IPC UUID');
  }

  debugTimer('begin ipc client connection');
  ipc.connectTo('dmno', `/tmp/${processUuid}.dmno.sock`, function () {
    debugTimer('ipc client connectTo callback');

    ipc.of.dmno.on('connect', function () {
      debugTimer('ipc client connect event + emit ready');
      ipc.log('## connected to dmno ##', ipc.config.retry);
      ipc.of.dmno.emit('ready');
    });

    ipc.of.dmno.on('disconnect', function () {
      ipc.log('disconnected from dmno');
    });

    ipc.of.dmno.on('request', async (message: any) => {
      const handler = (requestHandlers as any)[message.requestType];
      if (!handler) {
        throw new Error(`No handler for request type: ${message.requestType}`);
      }
      // we may receive a request before the vite server is ready
      await viteServerReadyDeferred.promise;
      const result = await handler(message.payload);
      ipc.of.dmno.emit('request-response', {
        requestId: message.requestId,
        response: result,
      });
    });
  });
}

// trigger this early so it can begin while other things are getting set up
initIpcClient();



// currently assuming we are using pnpm, and piggybacking off of their definition of "services" in pnpm-workspace.yaml
// we'll want to to do smarter detection and also support yarn/npm/etc as well as our own list of services defined at the root

// TODO: need smarter detection of pnpm monorepo?
// const IS_PNPM = fs.existsSync(`${CWD}/pnpm-lock.yaml`);
// if (IS_PNPM) console.log('detected pnpm');
// if (!IS_PNPM) throw new Error('Must be run in a pnpm-based monorepo');


type PnpmPackageListing = {
  name: string;
  version: string;
  path: string;
  private: boolean;
};

// using `pnpm m ls` to list workspace packages
const workspacePackagesRaw = await execAsync('pnpm m ls --json --depth=-1');
const workspacePackagesData = JSON.parse(workspacePackagesRaw.stdout) as Array<PnpmPackageListing>;
// workspace root should have the shortest path, since the others will all be nested
const workspaceRootEntry = _.minBy(workspacePackagesData, (w) => w.path.length)!;
const WORKSPACE_ROOT_PATH = workspaceRootEntry.path;
debugTimer('loaded workspace services via pnpm cli');


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

  transform(code, id, options) {
    // fairly naive way of doing this... but for now we are replacing `DMNO_CONFIG.SOME_KEY` with `ctx.get('SOME_KEY')`
    // TODO: we probably should limit which files this applies in
    // TODO: this also assumes the user is only calling this within a resolver that has a `(ctx) => ` call signature...
    return code.replaceAll(/DMNO_CONFIG\.([\w\d.]+)/g, 'ctx.get(\'$1\')');
  },

  async handleHotUpdate(ctx) {
    if (!devMode) return;
    // ignore updates to the generated type files
    if (ctx.file.includes('/.dmno/.typegen/')) return;

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

    debug(kleur.yellow(`Reload took ${endReloadAt.getTime() - startReloadAt.getTime()}ms`));
  },
};

// create vite server
const server = await createServer({
  root: WORKSPACE_ROOT_PATH,
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
viteServerReadyDeferred.resolve();

debugTimer('init vite');

// This can be used to test if we are importing @dmno/core correctly
// const testImport = await runner.executeFile('/Users/theo/dmno/core/example-repo/packages/webapp/.dmno/test.mts');
// console.log(testImport.DmnoService === DmnoService);
// process.exit(0);


let dmnoWorkspace: DmnoWorkspace;
let schemaLoaded = false;
let devMode = false;

async function reloadAllConfig() {
  dmnoWorkspace = new DmnoWorkspace();
  beginWorkspaceLoadPlugins(dmnoWorkspace);

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
      beginServiceLoadPlugins();

      // node-vite runs the file and returns the loaded module


      // when dealing with hot reloads in dev mode, the files that are in the cache are not retriggered
      // so we need to be aware that no side-effects would be re-triggered...
      // for example the plugin loading trick of using a singleton to capture those plugins breaks :(
      // the naive solution is to just clear the config files from the cache, but we may want to do something smarter
      // we probably want to clear all user authored files (in the .dmno folder) rather than just the config files

      // CLEAR EACH CONFIG FILE FROM THE CACHE SO WE RELOAD THEM ALL
      runner.moduleCache.deleteByModuleId(configFilePath);

      const importedConfig = await runner.executeFile(configFilePath);

      service = new DmnoService({
        ...serviceInitOpts,
        // TODO: check if the config file actually exported the right thing and throw helpful error otherwise
        rawConfig: importedConfig.default as ServiceConfigSchema,
      });

      finishServiceLoadPlugins(service);
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
  if (devMode) {
    await regenerateAllTypeFiles();
    await dmnoWorkspace.resolveConfig();
  }
  schemaLoaded = true;
}


async function regenerateAllTypeFiles() {
  for (const service of dmnoWorkspace.allServices) {
    await generateServiceTypes(service, true);
  }
}


