import path from 'node:path';
import crypto from 'crypto';
import {
  ChildProcess, spawn,
} from 'node:child_process';
import kleur from 'kleur';
import _ from 'lodash-es';
import ipc from 'node-ipc';
import Debug from 'debug';


import { ConfigLoaderRequestMap } from '../../config-loader/ipc-requests';
import { DeferredPromise, createDeferredPromise } from '../../lib/deferred-promise';
import { debugTimer } from './debug-timer';



const debug = Debug('dmno');

const thisFilePath = import.meta.url.replace(/^file:\/\//, '');

// the loader code will be relative to this file, and we are going to run the already built .mjs file
const loaderExecutablePath = path.resolve(thisFilePath, '../../../dist/config-loader/loader-executable.mjs');




export class ConfigLoaderProcess {
  startAt: Date;
  readyAt: Date | undefined;

  childProcess?: ChildProcess;
  isReady: DeferredPromise = createDeferredPromise();
  uuid = crypto.randomUUID();

  constructor() {
    this.startAt = new Date();
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
      debugTimer('ipc server connect event');
    });

    ipc.server.on('error', (err) => {
      debug('IPC error: ', err);
    });

    ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {
      ipc.log(`client ${destroyedSocketID} has disconnected!`);
    });

    ipc.server.on('request-response', (response) => {
      return this.handleRequestResponse(response);
    });

    ipc.server.on('ready', (response) => {
      debugTimer('IPC server received ready signal');
      this.readyAt = new Date();

      debug(kleur.yellow(`took ${+this.readyAt - +this.startAt} ms to boot`));
      this.isReady.resolve();
    });

    debugTimer('ipc server start!');
    ipc.server.start();
  }
  private async onIpcStarted() {
    debugTimer('IPC server started');
    try {
      this.childProcess = spawn('node', [loaderExecutablePath, this.uuid], { stdio: 'inherit' });
      debugTimer('spawn loader executable');
      this.childProcess.on('error', (err) => {
        debug('spawn error', err);
      });

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
  private requests = {} as Record<string, {
    startedAt: Date,
    deferredPromise: DeferredPromise
  }>;

  // TS magic here lets us auto-complete the available request types
  // and have a typed payload and response :)
  async makeRequest<K extends keyof ConfigLoaderRequestMap>(
    key: K,

    // some TS trickery to support passing no second arg when payload is undefined
    // see https://minajevs.medium.com/how-to-make-function-parameters-optional-in-typescript-8cb4fa22171d
    ...args: ConfigLoaderRequestMap[K]['payload'] extends undefined ? [] : [ConfigLoaderRequestMap[K]['payload']]
  ): Promise<ConfigLoaderRequestMap[K]['response']> {
    debug('making IPC request', key);

    const payload = args?.[0];
    // make sure IPC and the process is booted before we do anything
    await this.isReady.promise;


    // in order to make multiple concurrent requests, we create a "request id"
    // and use it to match up the reply. We'll use a simple counter for now...
    const requestId = this.requestCounter++;

    this.requests[requestId] = {
      startedAt: new Date(),
      deferredPromise: createDeferredPromise(),
    };

    // TODO: we may want to store more metadata so we can handle things like timeouts?

    // NOTE broadcast sends to _all_ clients, whereas emit would send to a specific one
    // since we are dealing with 1 client, it should be fine
    // but we may want to enforce that somewhow and track it
    ipc.server.broadcast('request', {
      requestId,
      requestType: key,
      payload,
    });

    return this.requests[requestId].deferredPromise.promise as any;
  }

  /** internal method called when receiving a request response */
  private handleRequestResponse(responseMessage: {
    requestId: string,
    response: any
  }) {
    debug('handle req response', responseMessage);
    const req = this.requests[responseMessage.requestId];
    // we just look up the request using the requestId, and resolve the deffered
    // promise with the response payload
    if (!req) {
      throw new Error(`IPC request not found: ${responseMessage.requestId}`);
    }
    req.deferredPromise.resolve(responseMessage.response);

    const reqTimeMs = +new Date() - +req.startedAt;
    debug(`request took ${reqTimeMs}ms`);

    // clean up...?
    delete this.requests[responseMessage.requestId];
  }
}

