// import {
//   createSecureServer, Http2Server, constants as HTTP2_CONSTANTS, createServer as createHttp2Server, Http2Stream,
// } from 'node:http2';
import { createServer, Server } from 'node:http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'node:https';

import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { lookup as dnsLookup, Resolver as DnsResolver } from 'node:dns/promises'
import { setTimeout as sleep } from 'node:timers/promises'

import { Server as SocketIoServer } from 'socket.io';
import ipc from 'node-ipc';
import mitt, { Handler } from 'mitt';
import Debug from 'debug';
import launchEditor from 'launch-editor';
import { createDeferredPromise } from '@dmno/ts-lib';

import kleur from 'kleur';
import { ConfigLoader } from './config-loader';
import { createDebugTimer } from '../cli/lib/debug-timer';
import { ConfigLoaderRequestMap } from './ipc-requests';
import { detectJsPackageManager } from '../lib/detect-package-manager';
import { createLocalSslCert } from '../lib/certs';
import { pathExists } from '../lib/fs-utils';
import { DmnoBaseTypes } from '../config-engine/configraph-adapter';


const debug = Debug('dmno');
const debugTimer = createDebugTimer('dmno:config-server');

const __dirname = dirname(fileURLToPath(import.meta.url));

// TODO: these should probably be read from a workspace-level yaml file
const DEFAULT_DEV_PORT = 3666;
const DEFAULT_DEV_HOST = 'dev.dmno.local';
const DEFAULT_DEV_SSL_ENABLED = false;

const MIME_TYPES = {
  js: 'text/javascript',
  html: 'text/html',
  css: 'text/css',
  ico: 'image/x-icon',
  // TODO: will need more for images
};

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION!', err);
});
process.on('unhandledRejection', (err) => {
  console.log('UNCAUGHT REJECTION!', err);
  console.log((err as any).stack);
});

export class ConfigServer {
  readonly uuid = process.env.DMNO_CONFIG_SERVER_UUID || crypto.randomUUID();

  constructor(private configLoader: ConfigLoader, opts?: {
    ipcOnly?: boolean
  }) {
    this.registerIpcRequestHandlers();
    this.initIpcServer();
    this.configLoader.onReload = this.onConfigReload.bind(this);

    if (!opts?.ipcOnly) {
      this.initWebServer().catch((err) => {
        console.log(err);
        process.exit(1);
      });
    }
  }

  get workspace() { return this.configLoader.dmnoWorkspace!; }


  private httpServer: HttpsServer | Server | undefined;
  private socketIoServer: SocketIoServer | undefined;
  
  private webServerListeningDeferred = createDeferredPromise();
  public get webServerListening() { return this.webServerListeningDeferred.promise; }
  private _webServerUrl?: string;
  public get webServerUrl() {
    return this._webServerUrl;
  }

  private async initWebServer() {
    const debugWeb = Debug('dmno:webserver');
    
    await this.configLoader.isReady;

    // TODO: this should probably be part of the initial workspace loading?
    let devPort = DEFAULT_DEV_PORT;
    let devHost = DEFAULT_DEV_HOST;
    let devSsl = DEFAULT_DEV_SSL_ENABLED;
    const workspaceSettings = this.configLoader.workspaceInfo.settings;
    if (workspaceSettings?.dev?.port) {
      try {
        devPort = DmnoBaseTypes.port().coerceAndValidate(workspaceSettings?.dev?.port);
      } catch (err) {
        console.log(`Invalid devUi.port in workspace settings - defaulting to ${devPort}`);
      }
    }
    if (workspaceSettings?.dev?.host) {
      try {
        // TODO: need a new "host" type and to validate it
        devHost = DmnoBaseTypes.string().coerceAndValidate(workspaceSettings?.dev?.host);
      } catch (err) {
        console.log(`Invalid devUi.host in workspace settings - defaulting to ${devHost}`);
      }
    }
    if (workspaceSettings?.dev?.ssl) {
      try {
        devSsl = DmnoBaseTypes.boolean().coerceAndValidate(workspaceSettings?.dev?.ssl);
      } catch (err) {
        console.log(`Invalid devUi.ssl in workspace settings - defaulting to ${devSsl}`);
      }
    }
    debugWeb('dev settings', { host: devHost, port: devPort, ssl: devSsl });

    try {
      // node dns "Resolver" allows for timeout control, but does not use the OS dns stack
      // node dns.lookup is actually a sync call wrapped to mimic async behaviour, with a long uneditable timeout
      // so this is an ugly hack to fail quickly if the dns lookup does not resolve properly
      // unfortunately, the process does hang, and the exit call is not immediate :(
      // see https://github.com/nodejs/node/issues/55525
      const raceResult = await Promise.race([
        sleep(10, false),
        dnsLookup(devHost),
      ]);
      if (raceResult === false) throw new Error('DNS LOOKUP FAILED');
    } catch (err) {
      // console.log(err);
      console.log(kleur.bold().red(`\n🔍💥 DNS lookup failed for dev host - ${devHost}\n`));
      console.log([
        '> Please add "',
        kleur.green(`${devHost} 127.0.0.1`),
        '" to your /etc/hosts file',
      ].join(''));
      console.log('\n\n');
      process.exit(1);
    }

    const devUiPath = path.resolve(`${__dirname}/../../node_modules/@dmno/dev-ui/dist/`);

    // ensure the dev ui dist files actually exist (should only be a problem during local dev)
    let devUiIndexHtml: string;
    try {
      devUiIndexHtml = await fs.promises.readFile(path.join(devUiPath, '/index.html'), 'utf-8');
    } catch (err) {
      throw new Error('dev ui dist files not found');
    }

    if (devSsl) {
      const certDir = path.join(this.configLoader.workspaceRootPath, '.dmno', 'certs');
      const { key, cert } = await createLocalSslCert(certDir);
      this.httpServer = createHttpsServer({ key, cert });
    } else {
      this.httpServer = createServer();
    }
    this.httpServer.on('request', async (request, response) => {
      let reqPath = request.url;
      if (!reqPath || reqPath === '/') reqPath = '/index.html';
      debugWeb('http request', reqPath);
      const fullPath = path.join(devUiPath, reqPath);
      try {
        const fileContents = await fs.promises.readFile(fullPath, 'utf-8');
        const extension = fullPath.split('.').pop();
        const responseMimeType = (MIME_TYPES as any)[extension || ''];
        response.writeHead(200, { 'content-type': responseMimeType });
        response.end(fileContents, 'utf-8');
      } catch (err) {
        if ((err as any).code === 'ENOENT') {
          response.writeHead(200, { 'content-type': 'text/html' });
          response.end(devUiIndexHtml);
        } else {
          throw err;
        }
      }
    });

    this.socketIoServer = new SocketIoServer(this.httpServer, {
      path: '/ws',
      serveClient: false,
      // allowRequest: (req, callback) => {
      //   console.log('checking', req);
      //   callback(null, true);
      // },
      cors: { origin: '*' },
    });
    this.socketIoServer.on('connection', (socket) => {
      debugWeb('socket connection');
      // let handshake = socket.handshake;

      socket.on('reload', async () => {
        await this.workspace.resolveConfig();
        socket.emit('workspace-update', this.workspace.toJSON());
      });

      socket.on('launch-editor', async (fileUrl) => {
        launchEditor(fileUrl);
      });

      socket.onAny((event, args) => {
        debugWeb('socket event!', event, args);
      });

      socket.on('request', async (message) => {
        debugWeb('received request over websocket', message);
        const handler = (this.requestHandlers as any)[message.requestType];
        if (!handler) {
          throw new Error(`No handler for request type: ${message.requestType}`);
        }

        // we may receive a request before the config loader is ready
        await this.configLoader.isReady;
        await this.ipcReady; // probably not necessary
        const result = await handler(message.payload);
        socket.emit('request-response', {
          requestId: message.requestId,
          response: result,
        });
      });

      debugWeb('connected!');
    });

    this._webServerUrl = `${devSsl ? 'https' : 'http'}://${devHost}:${devPort}`;
    debugWeb('booting web server', this._webServerUrl);
    this.httpServer.listen(devPort, devHost, () => {
      this.webServerListeningDeferred.resolve();
    });
  
    // this.httpsServer.listen(DEV_PORT);
  }



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

    ipc.server.on('request', async (message, socket) => {
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
    // console.log('loader process subscribe to event', eventType, handler);
    this.eventBus.on(eventType, handler);
  }



  // eslint-disable-next-line class-methods-use-this
  private broadcastIpcEvent(type: string, payload: any) {
    ipc.server.broadcast('event', { type, payload });
  }

  onReload?: () => void;
  private onConfigReload() {
    this.broadcastIpcEvent('reload', {});
    if (this.onReload) this.onReload();

    this.socketIoServer?.emit('workspace-update', this.workspace.toJSON());
  }


  // request handlers //////////////////////////////////////////

  registerIpcRequestHandlers() {
    this.registerRequestHandler('load-full-schema', async (payload) => {
      await this.workspace.resolveConfig();
      return this.workspace.toJSON();
    });

    this.registerRequestHandler('get-resolved-config', async (payload) => {
      // if selecting by package name, we'll first make sure the package is valid and initialized
      // this may need to move somewher else / happen earlier when setting up `dmno dev`?
      if (payload.packageName) {
        const selectedPackageInfo = this.configLoader.workspacePackagesData.find((p) => p.name === payload.packageName);
        if (selectedPackageInfo) {
          if (!selectedPackageInfo.dmnoFolder) {
            const packageManager = detectJsPackageManager();
            console.log(`\n🚨 Package ${selectedPackageInfo.name} has not yet been initialized as a DMNO service`);
            console.log();
            // TODO we'll want a helper to get commands for the current package manager (pnpm exec dmno)
            // could also detect current directory and skip the cd
            console.log('Please run the following command to get it set up:');
            console.log(kleur.cyan(` cd ${selectedPackageInfo.path} && ${packageManager.exec} dmno init`));
            console.log();
            process.exit(1);
          }
        } else {
          throw new Error(`Package ${payload.packageName} does not exist in your workspace`);
        }
      }


      await this.workspace.resolveConfig();
      const service = this.workspace.getService(payload);
      if (!service) {
        throw new Error(`Unable to select service - ${payload.serviceName || payload.packageName}`);
      }

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





