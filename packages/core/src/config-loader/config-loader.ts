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
import { ScannedWorkspaceInfo, WorkspacePackagesListing, findDmnoServices } from './find-services';
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
  isReady: Promise<void>;

  constructor() {
    this.isReady = this.finishInit();
    this.startAt = new Date();
  }

  private cacheMode: CacheMode = true;
  setCacheMode(cacheMode: typeof this.cacheMode) {
    if (this.dmnoWorkspace) this.dmnoWorkspace.setCacheMode(cacheMode);
    this.cacheMode = cacheMode;
  }


  viteRunner?: ViteNodeRunner;

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

  private async finishInit() {
    // console.time('find-services');
    this.workspaceInfo = await findDmnoServices();
    const dmnoServicePackages = this.workspaceInfo.workspacePackages.filter((p) => p.dmnoFolder);

    // during init there may be no services at all
    if (!dmnoServicePackages.length) return;

    // console.timeEnd('find-services');

    // TODO: we may want to do this on demand
    // so it does not slow down `dmno init` or other commands that don't need it
    const { viteRunner } = await setupViteServer(this.workspaceRootPath, (ctx) => this.viteHotReloadHandler(ctx));
    this.viteRunner = viteRunner;
  }

  onReload?: () => void | Promise<void>;

  private async viteHotReloadHandler(ctx: HmrContext) {
    if (this.devMode) {
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
    // make sure everything is initialized
    await this.isReady;

    if (!this.viteRunner) throw new Error('vite server not ready yet');

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
      const configFilePath = `${w.path}/.dmno/config.mts`;


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
        this.viteRunner.moduleCache.deleteByModuleId(configFilePath);

        const importedConfig = await this.viteRunner.executeFile(configFilePath);

        if (w.isRoot && !importedConfig.default._isDmnoWorkspaceConfig) {
          throw new Error('Workspace root .dmno/config.mts must `export default defineDmnoWorkspace(...)`');
        }
        if (!w.isRoot && !importedConfig.default._isDmnoServiceConfig) {
          throw new Error('Non-root .dmno/config.mts must `export default defineDmnoService(...)`');
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
    if (this.devMode) {
      await this.regenerateAllTypeFiles();
      await this.dmnoWorkspace.resolveConfig();
    }
    this.schemaLoaded = true;
  }

  private async regenerateAllTypeFiles() {
    if (!this.dmnoWorkspace) return;
    for (const service of this.dmnoWorkspace.allServices) {
      await generateServiceTypes(service, true);
    }
  }
}

