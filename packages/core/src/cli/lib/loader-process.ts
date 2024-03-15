import path from 'node:path';
import crypto from 'crypto';
import {
  ChildProcess, spawn,
} from 'node:child_process';
import kleur from 'kleur';
import _ from 'lodash-es';
import ipc from 'node-ipc';
import Debug from 'debug';

import { createServer } from 'vite';
import { ViteNodeServer } from 'vite-node/server';
import { ViteNodeRunner } from 'vite-node/client';
import { installSourcemapsSupport } from 'vite-node/source-map';

import { ConfigLoaderRequestMap } from '../../config-loader/ipc-requests';
import { DeferredPromise, createDeferredPromise } from '../../lib/deferred-promise';
import type { Plugin } from 'vite';

const debug = Debug('dmno');

const thisFilePath = import.meta.url.replace(/^file:\/\//, '');


const monorepoResolverPlugin: Plugin = {
  name: 'dmno-monorepo-resolver-plugin',
  // Run before the builtin 'vite:resolve' of Vite
  enforce: 'pre',
  resolveId(source, importer, options) {
    console.log('PLUGIN RESOLVE!', source, importer, options);
    return source;
    // if (resolveKeys.includes(source)) {
    //   // @see - https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention
    //   return prefix + source;
    // }
  },
  load(id, options) {
    console.log('PLUGIN LOAD!', id, options);
  },
};

// create vite server
const server = await createServer({
  optimizeDeps: {
    // It's recommended to disable deps optimization
    disabled: true,
  },
  ssr: true,
  appType: 'custom',
  clearScreen: false,

  plugins: [monorepoResolverPlugin],
  // if the folder we are running in has its own vite.config file, it will try to use it
  // passing false here tells it to skip that process
  configFile: false,
});
console.log(server.config);
// this is need to initialize the plugins
await server.pluginContainer.buildStart({});


// const thisNodeModulesDir = `${path.resolve(thisFilePath, '../../../node_modules')}/`;
// console.log(thisNodeModulesDir);

// create vite-node server
const node = new ViteNodeServer(server, {
  deps: { moduleDirectories: ['/node_modules/@dmno/core/node_modules/'] },
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
  fetchModule(id) {
    console.log('fetch module', id);
    return node.fetchModule(id);
  },
  resolveId(id, importer) {
    console.log('resolve id', id, importer);
    return node.resolveId(id, importer);
  },
});




// we know the location of this file is the dist folder of @dmno/core within the project's node_modules
// and since tsx is a dependency of @dmno/core, we can assume it will be in node_modules/.bin
// (we will probably need to adjust this to also work with yarn/npm etc...)
// const tsxPath = path.resolve(thisFilePath, '../../../node_modules/.bin/tsx');
const tsxPath = path.resolve(thisFilePath, '../../../node_modules/.bin/vite-node');

// the loader code will be relative to this file, and we are going to run the built mjs file
// (we could decide to run the ts directly since we are running via tsx)

const loaderExecutablePath = path.resolve(thisFilePath, '../../config-loader/loader-executable.mjs');

const startAt = new Date();
let readyAt: Date | undefined;

export class ConfigLoaderProcess {
  childProcess?: ChildProcess;
  isReady: DeferredPromise = createDeferredPromise();
  uuid = crypto.randomUUID();

  constructor() {
    // NOTE - we may want to initialize an ipc instance rather than using the global setup
    // but the TS types (from DefinitelyTyped) aren't working well for that :(

    ipc.config.id = 'dmno';
    ipc.config.retry = 1500;
    ipc.config.silent = true;

    // currently this defaults to using a socket at `/tmp/app.dmno`
    // we could put the socket in the root .dmno folder?
    // or at least name it differently?
    ipc.serve(`/tmp/${this.uuid}.dmno.sock`); // this has a callback... we aren't waiting here

    ipc.server.on('start', () => this.onIpcStarted());

    ipc.server.on('connect', (msg) => {
      debug('IPC message: ', msg);
    });

    ipc.server.on('error', (err) => {
      debug('IPC error: ', err);
    });

    ipc.server.on('message', (data, socket) => {
      debug('got a message : ', data);
      ipc.server.emit(
        socket,
        'message', // this can be anything you want so long as
        // your client knows.
        `${data} world!`,
      );
    });

    ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {
      ipc.log(`client ${destroyedSocketID} has disconnected!`);
    });

    ipc.server.on('request-response', (response) => {
      return this.handleRequestResponse(response);
    });

    ipc.server.on('ready', (response) => {
      debug('READY!!!');
      readyAt = new Date();

      console.log(kleur.yellow(`took ${readyAt.getTime() - startAt.getTime()} ms to boot`));
      this.isReady.resolve();
    });

    ipc.server.start();
  }
  private async onIpcStarted() {
    try {
      console.log('runner execute!');
      await runner.executeFile(loaderExecutablePath);
      console.log('executed');

      // console.log('spawning', tsxPath, loaderExecutablePath);
      // this.childProcess = spawn(tsxPath, [loaderExecutablePath, this.uuid], { stdio: 'inherit' });
      // this.childProcess.on('error', (err) => {
      //   debug('spawn error', err);
      // });

      // make sure we clean up!
      // TODO: this may not work in all cases? we might want a cli helper that will clean up rogue processes
      process.on('exit', (code) => {
        debug(kleur.bgRed(`KILLING LOADER PROCESS - exit code = ${code}`));
        this.childProcess?.kill();
      });
    } catch (err) {
      debug('error from spawn', err);
    }
  }


  // Tools for request/response communication with the loader proces
  // by default IPC just lets us send messages. This tooling allows us to make "requests"
  // and then receive a response - with type-safety throughout the process

  private requestCounter = 1;
  private requests = {} as Record<string, DeferredPromise>;

  // TS magic here lets us auto-complete the available request types
  // and have a typed payload and response :)
  async makeRequest<K extends keyof ConfigLoaderRequestMap>(
    key: K,
    payload: ConfigLoaderRequestMap[K]['payload'],
  ): Promise<ConfigLoaderRequestMap[K]['response']> {
    // make sure IPC and the process is booted before we do anything
    await this.isReady.promise;

    // in order to make multiple concurrent requests, we create a "request id"
    // and use it to match up the reply. We'll use a simple counter for now...
    const requestId = this.requestCounter++;

    const deferredPromise = createDeferredPromise();
    this.requests[requestId] = deferredPromise as any;

    // TODO: we may want to store more metadata so we can handle things like timeouts?

    // NOTE broadcast sends to _all_ clients, whereas emit would send to a specific one
    // since we are dealing with 1 client, it should be fine
    // but we may want to enforce that somewhow and track it
    ipc.server.broadcast('request', {
      requestId,
      requestType: key,
      payload,
    });

    return deferredPromise.promise as any;
  }

  /** internal method called when receiving a request response */
  private handleRequestResponse(responseMessage: {
    requestId: string,
    response: any
  }) {
    // we just look up the request using the requestId, and resolve the deffered
    // promise with the response payload
    if (!this.requests[responseMessage.requestId]) {
      throw new Error(`IPC request not found: ${responseMessage.requestId}`);
    }
    this.requests[responseMessage.requestId].resolve(responseMessage.response);

    // clean up...?
    delete this.requests[responseMessage.requestId];
  }
}

