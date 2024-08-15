import crypto from 'crypto';
import fs from 'node:fs';
import kleur from 'kleur';
import _ from 'lodash-es';

import Debug from 'debug';

import { DeferredPromise, createDeferredPromise } from '@dmno/ts-lib';
import { HmrContext } from 'vite';
import { ViteNodeRunner } from 'vite-node/client';
import { ConfigLoaderRequestMap } from './ipc-requests';
import { createDebugTimer } from '../cli/lib/debug-timer';
import { setupViteServer } from './vite-server';
import {
  ScannedWorkspaceInfo, WorkspacePackagesListing, findDmnoServices, findDmnoServicesInBuiltMode,
} from './find-services';
import {
  DmnoService, DmnoWorkspace, DmnoServiceConfig, CacheMode,
} from '../config-engine/config-engine';
import { beginServiceLoadPlugins, beginWorkspaceLoadPlugins, finishServiceLoadPlugins } from '../config-engine/plugins';
import { ConfigLoadError } from '../config-engine/errors';
import { generateServiceTypes } from '../config-engine/type-generation';

const debugTimer = createDebugTimer('dmno:config-loader');

const debug = Debug('dmno');

export class ConfigLoader {
  startAt: Date;
  readyAt: Date | undefined;

  // private isReadyDeferred: DeferredPromise = createDeferredPromise();
  // get isReady() { return this.isReadyDeferred.promise; }

  constructor() {
    this.startAt = new Date();
  }

  private cacheMode: CacheMode = true;
  setCacheMode(cacheMode: typeof this.cacheMode) {
    debug(`Config loader - setting cache mode = ${cacheMode}`);
    if (this.dmnoWorkspace) this.dmnoWorkspace.setCacheMode(cacheMode);
    this.cacheMode = cacheMode;
  }

  private builtConfigMode: boolean = false;
  setBuiltConfigMode(enabled: typeof this.builtConfigMode) {
    debug(`Config loader - use built config mode = ${enabled}`);
    this.builtConfigMode = enabled;
  }

  viteNodeRunner?: ViteNodeRunner;

  workspaceInfo!: ScannedWorkspaceInfo;
  get workspacePackagesData() {
    return this.workspaceInfo.workspacePackages;
  }
  get workspaceDmnoPackagesData() {
    return this.workspaceInfo.workspacePackages.filter((p) => !!p.dmnoFolder);
  }
  get workspaceRootPath() {
    return this.workspaceInfo.workspacePackages[0].path; // first should always be root (and is also marked)
  }

  async finishInit() {
    // console.time('find-services');
    this.workspaceInfo = this.builtConfigMode ? await findDmnoServicesInBuiltMode() : await findDmnoServices();
    const dmnoServicePackages = this.workspaceInfo.workspacePackages.filter((p) => p.dmnoFolder);

    // during init there may be no services at all
    if (!dmnoServicePackages.length) return;

    // console.timeEnd('find-services');
  }

  onReload?: () => void | Promise<void>;

  private async viteHotReloadHandler(ctx: HmrContext) {
    // changes to the cache file should not trigger a reload, as this would cause a loop
    // we could maybe set it up to watch manual edits to the file in between resolutions
    // but probably not worth it
    if (ctx.file.endsWith('.dmno/cache.json')) return;

    if (this.devMode) {
      debug('vite hot reload triggered by file:', ctx.file);
      await this.reload();
      if (this.onReload) await this.onReload();
    }
  }

  devMode = false;
  schemaLoaded = false;
  dmnoWorkspace?: DmnoWorkspace;

  async getWorkspace() {
    if (this.dmnoWorkspace) return this.dmnoWorkspace;
    await this.reload();
    return this.dmnoWorkspace!;
  }

  async reload() {
    if (!this.workspaceInfo) await this.finishInit();

    // make sure everything is initialized
    // await this.isReady;

    if (!this.viteNodeRunner) {
      // not 100% sure we want to make the vite server root the workspace root
      // TODO: need to add a new executionContextRoot or something instead of process.env.PWD
      const viteServerRootPath = this.builtConfigMode ? process.env.PWD! : this.workspaceRootPath;
      const { viteNodeRunner } = await setupViteServer(viteServerRootPath, (ctx) => this.viteHotReloadHandler(ctx));
      this.viteNodeRunner = viteNodeRunner;
    }

    // TODO: if not first load, clean up previous workspace? or reuse it somehow?
    this.dmnoWorkspace = new DmnoWorkspace();
    this.dmnoWorkspace.setCacheMode(this.cacheMode);
    beginWorkspaceLoadPlugins(this.dmnoWorkspace);

    // TODO: we may want to set up an initial sort of the services so at least root is first?
    for (const w of this.workspacePackagesData) {
      if (!w.dmnoFolder) continue;
      // not sure yet about naming the root file differently?
      // especially in the 1 service context, it may feel odd
      // const configFilePath = `${w.path}/.dmno/${isRoot ? 'workspace-' : ''}config.mts`;
      const configFilePath = `${w.path}/.dmno/config${this.builtConfigMode ? '.js' : '.mts'}`;

      const serviceInitOpts = {
        isRoot: w.isRoot,
        packageName: w.name,
        path: w.path,
        workspace: this.dmnoWorkspace,
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
        this.viteNodeRunner.moduleCache.deleteByModuleId(configFilePath);

        const importedConfig = await this.viteNodeRunner.executeFile(configFilePath);

        if (w.isRoot && !importedConfig.default.isRoot) {
          throw new Error('Root service .dmno/config.mts must set `isRoot: true`');
        }

        service = new DmnoService({
          ...serviceInitOpts,
          // NOTE - could actually be a DmnoServiceConfig or DmnoWorkspaceConfig
          rawConfig: importedConfig.default as DmnoServiceConfig,
        });

        finishServiceLoadPlugins(service);
      } catch (err) {
        debug('found error when loading config');
        service = new DmnoService({
          ...serviceInitOpts,
          rawConfig: new ConfigLoadError(err as Error),
        });
      }
      this.dmnoWorkspace.addService(service);
      debug('init service', service);
    }

    this.dmnoWorkspace.initServicesDag();
    this.dmnoWorkspace.processConfig();

    // TODO: currently this reloads EVERYTHING always. We need to be smarter about it
    await this.regenerateAllTypeFiles();
    await this.dmnoWorkspace.resolveConfig();

    // if (this.devMode) {
    //   await this.regenerateAllTypeFiles();
    //   await this.dmnoWorkspace.resolveConfig();
    // }
    this.schemaLoaded = true;
  }

  private async regenerateAllTypeFiles() {
    if (!this.dmnoWorkspace) return;
    for (const service of this.dmnoWorkspace.allServices) {
      await generateServiceTypes(service, true);
    }
  }
}

