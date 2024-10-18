import {
  createSecureServer, Http2Server, constants as HTTP2_CONSTANTS, createServer as createHttp2Server, Http2Stream,
} from 'node:http2';
import { createServer, Server } from 'node:http';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
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


const debug = Debug('dmno');
const debugTimer = createDebugTimer('dmno:config-server');

const __dirname = dirname(fileURLToPath(import.meta.url));

// TODO: these should probably be read from a workspace-level yaml file
const DEV_PORT = 3666;
const DEV_HOST = 'dev.dmno.local';
const SSL_ENABLED = true;

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


  private httpServer: Http2Server | Server | undefined;
  private socketIoServer: SocketIoServer | undefined;
  private async initWebServer() {
    await this.configLoader.isReady;

    const devUiPath = path.resolve(`${__dirname}/../../node_modules/@dmno/dev-ui/dist/`);

    // ensure the dev ui dist files actually exist (should only be a problem during local dev)
    let devUiIndexHtml: string;
    try {
      devUiIndexHtml = await fs.promises.readFile(path.join(devUiPath, '/index.html'), 'utf-8');
    } catch (err) {
      throw new Error('dev ui dist files not found');
    }

    if (SSL_ENABLED) {
      const certDir = path.join(this.configLoader.workspaceRootPath, '.dmno', 'certs');
      const { key, cert } = await createLocalSslCert(certDir);
      this.httpServer = createSecureServer({ key, cert, allowHTTP1: true });

      this.httpServer.on('stream', (stream, headers) => {
        let reqPath = headers[HTTP2_CONSTANTS.HTTP2_HEADER_PATH];
        // const reqMethod = headers[HTTP2_CONSTANTS.HTTP2_HEADER_METHOD];



        if (!reqPath || reqPath === '/') reqPath = '/index.html';
        console.log('ssl+http2 request!', reqPath);

        const fullPath = path.join(devUiPath, reqPath as string);
        const extension = fullPath.split('.').pop();
        // avoiding another dependency for a few mime-types
        const responseMimeType = (MIME_TYPES as any)[extension || ''];

        // zero dependency http2 web-server
        stream.respondWithFile(
          fullPath,
          { 'content-type': responseMimeType },
          {
            onError: (err) => {
              if (err.code === 'ENOENT') {
                stream.respondWithFile(
                  path.join(devUiPath, 'index.html'),
                  { 'content-type': 'text/html' },
                );
              } else {
              // console.log(err);
                if (err.code === 'ENOENT') {
                  stream.respond({ ':status': HTTP2_CONSTANTS.HTTP_STATUS_NOT_FOUND });
                } else {
                  stream.respond({ ':status': HTTP2_CONSTANTS.HTTP_STATUS_INTERNAL_SERVER_ERROR });
                }
                stream.end();
              }
            },
          },
        );
      });
    } else {
      this.httpServer = createServer();
      this.httpServer.on('request', async (request, response) => {
        let filePath = request.url;
        if (!filePath || filePath === '/') filePath = '/index.html';
        console.log('http request!', filePath);
        const fullPath = path.join(devUiPath, request.url as string);
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
    }






    this.socketIoServer = new SocketIoServer(this.httpServer, {
      // options
      path: '/ws',
      serveClient: false,
      // allowRequest: (req, callback) => {
      //   console.log('checking', req);
      //   callback(null, true);
      // },
      cors: {
        origin: '*',
      },
    });
    this.socketIoServer.on('connection', (socket) => {
      console.log('socket connection');
      // let handshake = socket.handshake;

      socket.on('reload', async () => {
        await this.workspace.resolveConfig();
        socket.emit('workspace-update', this.workspace.toJSON());
      });

      socket.on('launch-editor', async (fileUrl) => {
        launchEditor(fileUrl);
      });

      socket.onAny((event, args) => {
        console.log('socket event!', event, args);
      });

      socket.on('request', async (message) => {
        console.log('received request over websocket', message);
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

      console.log('connected!');
    });


    this.httpServer.listen(DEV_PORT, DEV_HOST, () => {
      console.log('dev ui web server available @', `${SSL_ENABLED ? 'https' : 'http'}://${DEV_HOST}:${DEV_PORT}`);
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





