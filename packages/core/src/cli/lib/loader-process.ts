import path from 'node:path';
import { promisify } from 'node:util';
import {
  ChildProcess, execFileSync, execSync, spawn, spawnSync,
} from 'node:child_process';
import pc from 'picocolors';
import _ from 'lodash-es';
import ipc from 'node-ipc';

import { DmnoRunCommandInfo } from '../../config-loader/loader-executable';
import { getThisDirname } from '../../lib/this-file-path';
import { ConfigLoaderRequestMap } from '../../config-loader/requests';
import { DeferredPromise, createDeferredPromise } from '../../lib/deferred-promise';

const thisFilePath = import.meta.url.replace(/^file:\/\//, '');

// we know the location of this file is the dist folder of @dmno/core within the project's node_modules
// and since tsx is a dependency of @dmno/core, we can assume it will be in node_modules/.bin
// (we will probably need to adjust this to also work with yarn/npm etc...)
const tsxPath = path.resolve(thisFilePath, '../../../node_modules/.bin/tsx');

// the loader code will be relative to this file, and we are going to run the built mjs file
// (we could decide to run the ts directly since we are running via tsx)

const loaderExecutablePath = path.resolve(thisFilePath, '../../config-loader/loader-executable.mjs');


export class ConfigLoaderProcess {
  childProcess?: ChildProcess;

  constructor() {
    // NOTE - we may want to initialize an ipc instance rather than using the global setup
    // but the TS types (from DefinitelyTyped) aren't working well for that :(

    ipc.config.id = 'dmno';
    ipc.config.retry = 1500;

    // currently this defaults to using a socket at `/tmp/app.dmno`
    // we could put the socket in the root .dmno folder?
    // or at least name it differently?
    ipc.serve(); // this has a callback... we aren't waiting here

    ipc.server.on('start', () => this.onIpcStarted());

    ipc.server.on('connect', (msg) => {
      console.log('IPC message: ', msg);
    });

    ipc.server.on('error', (err) => {
      console.log('IPC error: ', err);
    });

    ipc.server.on('message', (data, socket) => {
      ipc.log('got a message : ', data);
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

    ipc.server.start();
  }
  private async onIpcStarted() {
    console.log('ipc server started, booting up loader process');

    const instructions = {
      mode: 'load',
      service: 'web',
      format: 'json',
    };


    try {
      this.childProcess = spawn(tsxPath, [loaderExecutablePath], { stdio: 'inherit' });
      this.childProcess.on('error', (err) => {
        console.log('spawn error', err);
      });

      // make sure we clean up!
      // TODO: this may not work in all cases? we might want a cli helper that will clean up rogue processes
      process.on('exit', (code) => {
        console.log(pc.bgRed('KILLING LOADER PROCESS'));
        this.childProcess?.kill();
      });
    } catch (err) {
      console.log('error from spawn', err);
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

