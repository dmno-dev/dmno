import { ChildProcess, spawn } from 'node:child_process';
import ipc from 'node-ipc';
import mitt, { Handler } from 'mitt';
import Debug from 'debug';

import { DeferredPromise, createDeferredPromise } from '@dmno/ts-lib';
import { createDebugTimer } from '../cli/lib/debug-timer';
import { ConfigLoaderRequestMap } from './ipc-requests';
import { SerializedService } from './serialization-types';
import { formatError, getItemSummary } from '../cli/lib/formatting';
import { InjectedDmnoEnv } from '../config-engine/config-engine';

const debug = Debug('dmno');
const debugTimer = createDebugTimer('dmno:loader-client');

function getCurrentPackageName() {
  if (process.env.npm_package_name !== undefined) return process.env.npm_package_name;
  if (process.env.PNPM_PACKAGE_NAME !== undefined) return process.env.PNPM_PACKAGE_NAME;
}


export class ConfigServerClient {
  eventBus = mitt();

  readonly serverId: string;
  private ipc: typeof ipc;
  constructor() {
    this.ipc = ipc;

    if (process.env.DMNO_CONFIG_SERVER_UUID) {
      this.serverId = process.env.DMNO_CONFIG_SERVER_UUID;
    } else {
      this.serverId = crypto.randomUUID();
      this.initOwnedConfigServer();
    }

    this.initIpcClient();
  }

  private isShuttingDown = false;

  shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    this.ipc.disconnect('dmno');
    if (this.ownedDmnoConfigServerProcess) {
      this.ownedDmnoConfigServerProcess.kill(2);
    }
  }

  private ownedDmnoConfigServerProcess?: ChildProcess;
  private initOwnedConfigServer() {
    this.ownedDmnoConfigServerProcess = spawn('pnpm', 'exec dmno dev --silent'.split(' '), {
      stdio: 'inherit',
      env: {
        ...process.env,
        DMNO_CONFIG_SERVER_UUID: this.serverId,
        // PATH: process.env.PATH,
      },
    });
    // console.log(this.ownedDmnoConfigServerProcess);

    process.on('SIGTERM', () => {
      // console.log('client process - sigterm!');
      this.shutdown();
    });

    process.on('exit', () => {
      // console.log('client process - exit!');
      this.shutdown();
    });

    this.ownedDmnoConfigServerProcess.on('close', (code, signal) => {
      // console.log('dmno config server - close');
    });

    this.ownedDmnoConfigServerProcess.on('disconnect', () => {
      // console.log('dmno config server - disconnect');
      // process.exit(1);
    });

    this.ownedDmnoConfigServerProcess.on('error', (err) => {
      // console.log('dmno config server process -  error', err);
      // process.exit(0);
    });

    this.ownedDmnoConfigServerProcess.on('exit', (code, signal) => {
      console.log('dmno config server process exit', code, signal);
      if (!this.isShuttingDown) process.exit(code || 1);
    });
  }



  private ipcReadyDeferred = createDeferredPromise();
  private initIpcClient() {
    this.ipc.config.id = 'dmno';
    this.ipc.config.retry = 1500;
    this.ipc.config.silent = true;

    // we pass in a uuid to identify the running process IPC socket
    // this allows us to run multiple concurrent loaders...
    // TBD whether that makes sense or if we should share a single process?

    debugTimer('begin ipc client connection');
    this.ipc.connectTo('dmno', `/tmp/${this.serverId}.dmno.sock`, () => {
      debugTimer('ipc client connectTo callback');

      this.ipc.of.dmno.on('connect', () => {
        debugTimer('ipc client connect event + emit ready');
        this.ipc.log('## connected to dmno ##', this.ipc.config.retry);
        this.ipc.of.dmno.emit('ready');
        this.ipcReadyDeferred.resolve();
      });

      this.ipc.of.dmno.on('disconnect', () => {
        this.ipc.log('disconnected from dmno');
      });

      this.ipc.of.dmno.on('event', (eventMessage) => {
        console.log('received IPC event message', eventMessage);
        this.eventBus.emit(eventMessage.type, eventMessage.payload);
      });

      this.ipc.of.dmno.on('request-response', this.handleRequestResponse.bind(this));
    });
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
    await this.ipcReadyDeferred.promise;
    debug('making IPC request', key);

    const payload = args?.[0];

    // make sure IPC and the process is booted before we do anything
    // await this.isReady;


    // in order to make multiple concurrent requests, we create a "request id"
    // and use it to match up the reply. We'll use a simple counter for now...
    // we may want to add a random client id prefix too?
    const requestId = this.requestCounter++;

    this.requests[requestId] = {
      startedAt: new Date(),
      deferredPromise: createDeferredPromise(),
    };

    // TODO: we may want to store more metadata so we can handle things like timeouts?
    ipc.of.dmno.emit('request', {
      requestId,
      requestType: key,
      payload,
    });

    return this.requests[requestId].deferredPromise.promise as any;
  }

  /** internal method called when receiving a request response */
  private handleRequestResponse(responseMessage: {
    requestId: string,
    response: any,
    error?: any,
  }) {
    debug('handle req response', responseMessage);
    const req = this.requests[responseMessage.requestId];
    // we just look up the request using the requestId, and resolve the deffered
    // promise with the response payload
    if (!req) {
      throw new Error(`IPC request not found: ${responseMessage.requestId}`);
    }
    if (responseMessage.error) {
      const e = new Error(responseMessage.error.message);
      e.stack = responseMessage.error.stack;
      req.deferredPromise.reject(e);
    } else {
      req.deferredPromise.resolve(responseMessage.response);
    }

    const reqTimeMs = +new Date() - +req.startedAt;
    debug(`request took ${reqTimeMs}ms`);

    // clean up...?
    delete this.requests[responseMessage.requestId];
  }


  async getServiceConfig() {
    const packageName = getCurrentPackageName();
    if (packageName === '') {
      throw new Error('To use dmno, you must set a package "name" in your package.json file');
    }
    // what to do if we can't figure out a package name?

    const serviceConfig = await this.makeRequest('get-resolved-config', { packageName });
    return serviceConfig;
  }

  static checkServiceIsValid(service: SerializedService, log = true) {
    if (service.configLoadError) {
      console.log('🚨 🚨 🚨  unable to load config schema  🚨 🚨 🚨');
      console.log(formatError(service.configLoadError));
      return false;
    }
    // plugins!

    if (service.schemaErrors?.length) {
      console.log('🚨 🚨 🚨  config schema is invalid  🚨 🚨 🚨');
      console.log(service.schemaErrors.forEach((err) => {
        console.log(formatError(err));
      }));
      return false;
    }

    const failingItems = Object.values(service.config).filter((c) => !c.isValid);
    if (failingItems.length) {
      console.log('🚨 🚨 🚨  config is invalid  🚨 🚨 🚨');
      failingItems.forEach((item) => {
        console.log(getItemSummary(item));
        console.log();
      });
      return false;
    }

    return true;
  }
}

export function serializedServiceToInjectedConfig(service: SerializedService): InjectedDmnoEnv {
  const injectedEnv: InjectedDmnoEnv = {};
  for (const itemKey in service.config) {
    const configItem = service.config[itemKey];
    injectedEnv[itemKey] = {
      sensitive: !!configItem.dataType.sensitive,
      dynamic: !!configItem.isDynamic,
      value: configItem.resolvedValue,
    };
  }
  return injectedEnv;
}
