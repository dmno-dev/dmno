import ipc from 'node-ipc';
import mitt, { Handler } from 'mitt';
import Debug from 'debug';
import { DeferredPromise, createDeferredPromise } from '@dmno/ts-lib';

import { ConfigLoader } from './config-loader';
import { createDebugTimer } from '../cli/lib/debug-timer';
import { ConfigLoaderRequestMap } from './ipc-requests';


const debug = Debug('dmno');
const debugTimer = createDebugTimer('dmno:config-server');

export class ConfigServer {
  readonly uuid = process.env.DMNO_CONFIG_SERVER_UUID || crypto.randomUUID();

  constructor(private configLoader: ConfigLoader) {
    this.registerRequestHandlers();
    this.initIpcServer();
    this.configLoader.onReload = this.onConfigReload.bind(this);
  }

  get workspace() { return this.configLoader.dmnoWorkspace!; }


  private requestHandlers = {} as Record<keyof ConfigLoaderRequestMap, any>;
  private registerRequestHandler<K extends keyof ConfigLoaderRequestMap>(
    requestType: K,
    handler: (payload: ConfigLoaderRequestMap[K]['payload']) => Promise<ConfigLoaderRequestMap[K]['response']>,
  ) {
  // console.log(`registered handler for requestType: ${requestType}`);
    if (this.requestHandlers[requestType]) {
      throw new Error(`Duplicate IPC request handler detected for requestType "${requestType}"`);
    }
    this.requestHandlers[requestType] = handler;
  }


  // eslint-disable-next-line class-methods-use-this
  shutdown() {
    ipc.disconnect('dmno');
  }

  private ipcReadyDeferred = createDeferredPromise();
  private get ipcReady() { return this.ipcReadyDeferred.promise; }
  private initIpcServer() {
    // NOTE - we may want to initialize an ipc instance rather than using the global setup
    // but the TS types (from DefinitelyTyped) aren't working well for that :(
    ipc.config.id = 'dmno';
    ipc.config.retry = 1500;
    ipc.config.silent = true;

    // currently this defaults to using a socket at `/tmp/app.dmno`
    // we could put the socket in the root .dmno folder?
    // or at least name it differently?
    ipc.serve(`/tmp/${this.uuid}.dmno.sock`); // this has a callback... we aren't waiting here

    ipc.server.on('start', () => {
      debugTimer('IPC server started');
    });

    ipc.server.on('connect', (msg) => {
      debugTimer('ipc server connect event');
    });

    ipc.server.on('error', (err) => {
      debug('IPC error: ', err);
    });

    ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {
      ipc.log(`client ${destroyedSocketID} has disconnected!`);
    });

    ipc.server.on('request', async (message: any, socket: any) => {
      debug('received request from IPC client', message);
      const handler = (this.requestHandlers as any)[message.requestType];
      if (!handler) {
        throw new Error(`No handler for request type: ${message.requestType}`);
      }

      // we may receive a request before the config loader is ready
      await this.configLoader.isReady;
      await this.ipcReady; // probably not necessary
      const result = await handler(message.payload);
      ipc.server.emit(socket, 'request-response', {
        requestId: message.requestId,
        response: result,
      });
    });

    // ipc.server.on('event', (eventMessage) => {
    //   console.log('ipc server received event', eventMessage);
    //   return this.eventBus.emit(eventMessage.eventType, eventMessage.payload);
    // });

    ipc.server.on('ready', (response) => {
      debugTimer('IPC server received ready signal');
      this.ipcReadyDeferred.resolve();
      // this.readyAt = new Date();

      // debug(kleur.yellow(`took ${+this.readyAt - +this.startAt} ms to boot`));
    });

    debugTimer('ipc server start!');
    ipc.server.start();


    // process.on('SIGKILL', () => {
    //   console.log('CONFIG SERVER - SIGKILL');
    // });
    process.on('SIGTERM', () => {
      // console.log('CONFIG SERVER PROCESS - SIGTERM');
    });
    process.on('SIGINT', () => {
      // console.log('CONFIG SERVER PROCESS - SIGINT');
    });
    process.on('exit', (code) => {
      ipc.server.stop();
      // console.log('CONFIG SERVER PROCESS - EXIT');
    });
  }

  eventBus = mitt();
  onEvent(eventType: string, handler: Handler) {
    console.log('loader process subscribe to event', eventType, handler);
    this.eventBus.on(eventType, handler);
  }



  // eslint-disable-next-line class-methods-use-this
  private broadcastIpcEvent(type: string, payload: any) {
    ipc.server.broadcast('event', { type, payload });
  }

  private onConfigReload() {
    this.broadcastIpcEvent('reload', { foo: 1 });
  }


  // request handlers //////////////////////////////////////////

  registerRequestHandlers() {
    this.registerRequestHandler('load-full-schema', async (payload) => {
      await this.workspace.resolveConfig();
      return this.workspace.toJSON();
    });

    this.registerRequestHandler('get-resolved-config', async (payload) => {
      await this.workspace.resolveConfig();
      const service = this.workspace.getService(payload);
      if (!service) throw new Error('Unable to select a service');

      return service.toJSON();
    });


    // registerRequestHandler('generate-types', async (payload) => {
    //   if (!schemaLoaded) await reloadAllConfig();
    //   const service = dmnoWorkspace.getService(payload);
    //   if (!service) throw new Error('Unable to select a service');

    //   return { tsSrc: await generateTypescriptTypes(service) };
    // });
  }
}





