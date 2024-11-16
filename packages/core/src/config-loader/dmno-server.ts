import https from 'node:https';
import path, { dirname } from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { Server as SocketIoServer } from 'socket.io';
import uWS from 'uWebSockets.js';
import launchEditor from 'launch-editor';
import Debug from 'debug';
import { CacheMode } from '@dmno/configraph';
import { createDeferredPromise } from '@dmno/ts-lib';
import { ConfigLoader } from './config-loader';
import { loadOrCreateTlsCerts } from '../lib/certs';
import { pathExists } from '../lib/fs-utils';
import { findDmnoServices } from './find-services';
import { MIME_TYPES_BY_EXT, uwsBodyParser, uwsValidateClientCert } from '../lib/uws-utils';


const __dirname = dirname(fileURLToPath(import.meta.url));

// TODO: read port from workspace yaml file, or just pick an available one?
const STATIC_PORT = 3666;

// TODO: do we want to allow changing the host? or just always use localhost?
// see old config-server.ts for details

// TODO: do we want to allow toggling OFF ssl for the web ui?



function getCurrentPackageName() {
  if (process.env.npm_package_name !== undefined) return process.env.npm_package_name;
  if (process.env.PNPM_PACKAGE_NAME !== undefined) return process.env.PNPM_PACKAGE_NAME;
}


export class DmnoServer {
  readonly serverId: string;
  private isChildServer: boolean = false;
  private configLoader?: ConfigLoader;

  constructor(readonly opts?: {
    watch?: boolean,
    enableWebUi?: boolean,
  }) {
    if (process.env.DMNO_CONFIG_SERVER_UUID) {
      this.serverId = process.env.DMNO_CONFIG_SERVER_UUID;
      this.isChildServer = true;
      this.webServerReady = this.initChildServer();
    } else {
      this.serverId = crypto.randomUUID();
      console.time('init configloader');
      this.configLoader = new ConfigLoader(!!opts?.watch);
      this.webServerReady = this.bootWsServer();
    }
  }


  private async initChildServer() {
    const workspaceInfo = await findDmnoServices();
    const workspaceRootPath = workspaceInfo.workspacePackages[0].path;
    const certDir = `${workspaceRootPath}/.dmno/certs`;
    this.certs = await loadOrCreateTlsCerts('localhost', certDir);
  }


  readonly webServerReady?: Promise<void>;
  private uwsServer?: uWS.TemplatedApp;
  private uwsPort = STATIC_PORT;
  private certs?: Awaited<ReturnType<typeof loadOrCreateTlsCerts>>;

  private _webServerUrl?: string;
  public get webServerUrl() { return this._webServerUrl; }

  private socketIoServer: SocketIoServer | undefined;

  async bootWsServer() {
    // TODO: we could wait until the workspace info is loaded only
    if (!this.configLoader) throw new Error('no configLoader');
    await this.configLoader.isReady;

    const uwsServerListeningDeferred = createDeferredPromise();

    const certDir = `${this.configLoader.workspaceRootPath}/.dmno/certs`;
    this.certs = await loadOrCreateTlsCerts('localhost', certDir);


    const devUiPath = path.resolve(`${__dirname}/../dev-ui-dist/`);

    // ensure the dev ui dist files actually exist (should only be a problem during local dev)
    let devUiIndexHtml: string;
    if (this.opts?.enableWebUi) {
      try {
        devUiIndexHtml = await fs.promises.readFile(path.join(devUiPath, '/index.html'), 'utf-8');
      } catch (err) {
        throw new Error(`dev ui dist files not found @ ${devUiPath}`);
      }
    }

    this.uwsServer = uWS.SSLApp({
      cert_file_name: path.join(certDir, 'SERVER.crt'),
      key_file_name: path.join(certDir, 'SERVER_key.pem'),
      ca_file_name: path.join(certDir, 'CA.crt'),
      // passphrase: '1234',
    })
      .any('/api/:requestName', async (res, req) => {
        /* Can't return or yield from here without responding or attaching an abort handler */
        res.onAborted(() => {
          res.aborted = true;
        });

        if (!uwsValidateClientCert(res, this.certs!.caCert)) return;

        const reqName = req.getParameter(0) || '';
        if (!(reqName in this.commands)) {
          res.writeStatus('404');
          res.end(JSON.stringify({ error: 'Not found!' }));
          return;
        }

        // parse the body to get function args
        let args;
        if (req.getMethod() === 'post') {
          try {
            args = await uwsBodyParser(res);
          } catch (err) {
            res.writeStatus('400');
            console.log(err);
            res.end(JSON.stringify({ error: 'body parsing failed' }));
            return;
          }
        } else if (req.getMethod() === 'get') {
          args = [];
        } else {
          res.writeStatus('404');
          res.end(JSON.stringify({ error: 'unsupported method' }));
          return;
        }


        // @ts-ignore
        const rawResponse = await this.commands[reqName].call(this, ...args);

        /* If we were aborted, you cannot respond */
        if (!res.aborted) {
          res.cork(() => {
            res.end(JSON.stringify(rawResponse));
          });
        }
      })
      .any('/*', async (res, req) => {
        res.onAborted(() => {
          res.aborted = true;
        });

        if (!uwsValidateClientCert(res, this.certs!.caCert)) return;

        if (!this.opts?.enableWebUi) {
          res.writeStatus('404');
          res.writeHeader('content-type', 'text/html');
          res.end('<h1>dmno web ui is disabled</h1><p>Run `dmno dev` to boot the web dashboard</p>');
          return;
        }

        // have to use .any for the route matching to work properly
        if (req.getMethod() !== 'get') {
          res.writeStatus('404');
          res.end(JSON.stringify({ error: 'method not supported' }));
        }


        let reqPath = req.getUrl();
        if (!reqPath || reqPath === '/') reqPath = '/index.html';
        // debugWeb('http request', reqPath);


        const fullPath = path.join(devUiPath, reqPath);
        const extension = fullPath.split('.').pop();

        let fileContents = devUiIndexHtml;
        let contentType = 'text/html';

        try {
          fileContents = await fs.promises.readFile(fullPath, 'utf-8');
          contentType = (MIME_TYPES_BY_EXT as any)[extension || ''];
        } catch (err) {
          if ((err as any).code === 'ENOENT') {
            if (reqPath.startsWith('/assets/')) {
              res.writeStatus('404');
              res.writeHeader('content-type', 'text/html');
              res.end('<h1>oops! file does not exist</h1>');
              return;
            }
          } else {
            throw err;
          }
        }

        if (!res.aborted) {
          res.cork(() => {
            res.writeStatus('200');
            res.writeHeader('content-type', contentType);
            res.end(fileContents);
          });
        }
      })
      .listen(this.uwsPort, (token) => {
        this.uwsPort = uWS.us_socket_local_port(token);
        this._webServerUrl = `https://localhost:${this.uwsPort}`;
        if (token) {
          console.log(`Listening to port ${this.uwsPort}`);
        } else {
          console.log('Failed finding available port');
        }
        uwsServerListeningDeferred.resolve();
      });

    process.on('exit', (code) => {
      // TODO: can be smarter about tracking what needs to be shut down
      try {
        this.uwsServer?.close();
      } catch (err) {

      }
    });

    await uwsServerListeningDeferred.promise;

    if (this.opts?.enableWebUi) {
      await this.initSocketIoServer();
    }
  }

  async initSocketIoServer() {
    if (!this.configLoader) throw new Error('configLoader not found');

    const debugWeb = Debug('dmno:webserver');

    this.socketIoServer = new SocketIoServer({
      path: '/ws',
      serveClient: false,
      // allowRequest: (req, callback) => {
      //   console.log('checking', req);
      //   callback(null, true);
      // },
      cors: { origin: '*' },
    });
    this.socketIoServer.attachApp(this.uwsServer);
    this.socketIoServer.on('connection', (socket) => {
      debugWeb('socket connection');
      // let handshake = socket.handshake;

      socket.on('reload', async () => {
        const workspace = await this.configLoader?.getWorkspace();
        socket.emit('workspace-update', workspace);
      });

      socket.on('launch-editor', async (fileUrl) => {
        launchEditor(fileUrl);
      });

      socket.onAny((event, args) => {
        debugWeb('socket event!', event, args);
      });

      socket.on('request', async (message) => {
        debugWeb('received request over websocket', message);

        await this.configLoader!.isReady;

        const result = await this.makeRequest(message.requestType, ...message.args);

        socket.emit('request-response', {
          requestId: message.requestId,
          response: result,
        });
      });

      debugWeb('connected!');
    });
  }


  shutdown() {
    this.uwsServer?.close();
    this.configLoader?.shutdown().catch(() => {
      console.log('error shutting down dmno vite dev server');
    });
  }

  async makeRequest<
    K extends keyof typeof this.commands,
  >(
    requestName: K,
    ...args: Parameters<typeof this.commands[K]>
  ): Promise<ReturnType<typeof this.commands[K]>> {
    console.log('make request', requestName);
    // have to wait for server to be ready before we can send a request
    await this.webServerReady;

    // In theory, we could check if we are currently in the parent server
    // and if so skip communicating over http/uws
    // but the overhead seems negligible?

    // if not a child, we will wait for the config loader to finish loading
    if (!this.isChildServer) {
      await this.configLoader?.isReady;
      console.timeEnd('init configloader');

      // we can bypass the http request if this is not a child server
      // but the overhead is very minimal, so we will re-enable this later
      // return (this.commands[requestName] as any).apply(this, args);
    }

    const rawResult = await this.mTlsFetchHelper(`/api/${requestName}`, args);
    const result = JSON.parse(rawResult as any);
    // const result = await rawResult.json();
    return result;
  }

  private async mTlsFetchHelper(urlPath: string, data?: any) {
    const deferred = createDeferredPromise();
    if (!this.certs) throw new Error('missing certs!');

    const postData = JSON.stringify(data);

    const clientOptions = {
      hostname: 'localhost',
      port: this.uwsPort,
      path: urlPath,
      method: 'POST',
      ...data !== undefined && {
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      key: this.certs.clientKey,
      cert: this.certs.clientCert,
      ca: [this.certs.caCert],
      rejectUnauthorized: false,
    };

    const req = https.request(clientOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        // console.log('Response from server:', data);
        deferred.resolve(data);
      });
    });

    req.on('error', (e) => {
      // console.error('errp', e);
      deferred.reject(e);
    });

    if (data !== undefined) req.write(postData);
    req.end();

    return deferred.promise;
  }



  setCacheMode(cacheMode: CacheMode) {
    if (this.configLoader) {
      this.configLoader.cacheMode = cacheMode;
    }
  }
  enableWatchMode(onReload: () => void | Promise<void>) {
    if (this.configLoader) {
      console.log('enable watch mode');
      this.configLoader.devMode = true;
      this.configLoader.onReload = async () => {
        console.log('configLoader triggered reload handler');
        await onReload();

        if (this.socketIoServer) {
          const workspace = await this.configLoader?.getWorkspace();
          this.socketIoServer.emit('workspace-update', workspace);
        }
      };
    }
  }

  // ~ external facing functions to interact with config
  commands = {
    ping() {
      return { pong: true };
    },
    loadFullSchema: async () => {
      console.time('get workspace');
      const workspace = await this.configLoader?.getWorkspace()!;
      console.timeEnd('get workspace');

      console.time('resolve');
      await workspace.resolveConfig();
      console.timeEnd('resolve');
      return workspace.toJSON();
    },
    getInjectedJson: async (serviceId: string) => {
      const workspace = await this.configLoader?.getWorkspace()!;
      const service = workspace.getService(serviceId);
      return service.getInjectedEnvJSON();
    },
    clearCache: async () => {
      const workspace = await this.configLoader?.getWorkspace()!;
      const cacheFilePath = workspace.configraph.cacheProvider.cacheFilePath;

      let wasDeleted = false;
      if (await pathExists(cacheFilePath)) {
        await workspace.configraph.cacheProvider.reset();
        wasDeleted = true;
      }

      return {
        cacheFilePath,
        wasDeleted,
      };
    },
  };

  async getWorkspace() {
    return this.makeRequest('loadFullSchema');
  }

  // TODO: this isnt necessarily in the right place
  // but the logic was moved from ConfigServerClient and it is convenient to have
  // this within whatever will be imported and used within integrations (vite  plugins)
  async getCurrentPackageConfig() {
    const packageName = getCurrentPackageName();
    if (packageName === '') {
      throw new Error('To use dmno, you must set a package "name" in your package.json file');
    }
    // what to do if we can't figure out a package name?

    const workspace = await this.getWorkspace();
    const service = Object.values(workspace.services).find((s) => s.packageName === packageName);
    if (!service) {
      throw new Error(`Unable to select service - ${packageName}`);
    }

    const injectedEnv = await this.makeRequest('getInjectedJson', service.serviceName);

    return {
      serviceDetails: service,
      injectedEnv,
    };
  }
}

