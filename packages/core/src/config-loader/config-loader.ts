import path from 'node:path';

import _ from 'lodash-es';

import Debug from 'debug';

import { ConfigLoadError, CacheMode } from '@dmno/configraph';

import { HmrContext, ViteDevServer } from 'vite';
import { ViteNodeRunner } from 'vite-node/client';
import { ViteNodeServer } from 'vite-node/server';
import { createDeferredPromise } from '@dmno/ts-lib';
import { createDebugTimer } from '../cli/lib/debug-timer';
import { setupViteServer } from './vite-server';
import { ScannedWorkspaceInfo, findDmnoServices } from './find-services';
import {
  DmnoService, DmnoWorkspace, DmnoServiceConfig,
} from '../config-engine/config-engine';
import { generateServiceTypes } from '../config-engine/type-generation';
import {
  beginServiceLoadPlugins, beginWorkspaceLoadPlugins, finishServiceLoadPlugins, InjectedPluginDoesNotExistError,
} from '../config-engine/dmno-plugin';


const debugTimer = createDebugTimer('dmno:config-loader');

const debug = Debug('dmno');

export class ConfigLoader {
  startAt: Date;
  readyAt: Date | undefined;

  // private isReadyDeferred: DeferredPromise = createDeferredPromise();
  // get isReady() { return this.isReadyDeferred.promise; }
  isReady: Promise<void>;

  constructor(private enableWatch: boolean) {
    this.startAt = new Date();
    this.isReady = this.finishInit();
  }

  viteRunner?: ViteNodeRunner;
  viteServer?: ViteDevServer;

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
    this.workspaceInfo = await findDmnoServices();
    // already filtered to only services with a .dmno folder
    const dmnoServicePackages = this.workspaceInfo.workspacePackages;

    // during init there may be no services at all
    if (!dmnoServicePackages.length) return;



    // TODO: we may want to do this on demand
    // so it does not slow down `dmno init` or other commands that don't need it
    const { viteRunner, viteServer } = await setupViteServer({
      workspaceRootPath: this.workspaceRootPath,
      enableWatch: this.enableWatch,
      hotReloadHandler: (ctx) => this.viteHotReloadHandler(ctx),
    });
    this.viteRunner = viteRunner;
    this.viteServer = viteServer;
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

  async shutdown() {
    await this.viteServer?.close();
  }

  devMode = false;
  schemaLoaded = false;
  dmnoWorkspace?: DmnoWorkspace;
  cacheMode: CacheMode = true;
  resolutionPhase?: UseAtPhases;

  async getWorkspace() {
    if (this.isReloadInProgress) await this.reloadCompleted;
    if (this.dmnoWorkspace) return this.dmnoWorkspace;
    await this.reload();
    return this.dmnoWorkspace!;
  }

  private isReloadInProgress = false;
  private reloadCompleted?: Promise<unknown>;
  async reload() {
    if (this.isReloadInProgress) {
      await this.reloadCompleted;
      return;
    }

    this.isReloadInProgress = true;

    const deferredCompleted = createDeferredPromise();
    this.reloadCompleted = deferredCompleted.promise;

    // make sure everything is initialized
    await this.isReady;

    if (!this.viteRunner) throw new Error('vite server not ready yet');

    // TODO: if not first load, clean up previous workspace? or reuse it somehow?
    this.dmnoWorkspace = new DmnoWorkspace();

    //! keep an eye on this, not sure if in the right place... we want to clear the cache _once_ and then go back to normal
    if (this.cacheMode === 'clear') {
      // normally the cache directory path gets set later, but we'll set it here so we can clear it
      this.dmnoWorkspace.configraph.cacheProvider.cacheDirPath = path.join(this.workspaceRootPath, '.dmno');
      await this.dmnoWorkspace.configraph.cacheProvider?.reset();
      this.cacheMode = true;
    }

    this.dmnoWorkspace.configraph.setCacheMode(this.cacheMode);

    beginWorkspaceLoadPlugins(this.dmnoWorkspace);

    let servicesToLoad = [...this.workspacePackagesData];
    let nextBatchServicesToLoad: typeof servicesToLoad = [];
    do {
      const toLoadCount = servicesToLoad.length;
      for (const w of servicesToLoad) {
        if (!w.dmnoFolder) continue;
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
          // in injection failed, we put back onto the
          if (err instanceof InjectedPluginDoesNotExistError) {
            nextBatchServicesToLoad.push(w);
          }

          debug('found error when loading config');
          console.log(err);
          service = new DmnoService({
            ...serviceInitOpts,
            rawConfig: new ConfigLoadError(err as Error),
          });
        }
        this.dmnoWorkspace.addService(service);
        debug('init service', service);
      }

      // if we went through a batch and made no progress, we're in an error state
      if (toLoadCount === nextBatchServicesToLoad.length) {
        // ERROR!
        //! this needs to go into a mode where we stop retrying and save the errors
      // otherwise we try again with the next batch
      } else {
        servicesToLoad = nextBatchServicesToLoad;
        nextBatchServicesToLoad = [];
      }
    } while (servicesToLoad.length);

    this.dmnoWorkspace.initServicesDag();
    this.dmnoWorkspace.processConfig();

    // TODO: currently this reloads EVERYTHING always. We need to be smarter about it
    await this.regenerateAllTypeFiles();
    await this.dmnoWorkspace.resolveConfig();

    this.schemaLoaded = true;
  }

  private async regenerateAllTypeFiles() {
    if (!this.dmnoWorkspace) return;
    for (const service of this.dmnoWorkspace.allServices) {
      await generateServiceTypes(service, true);
    }
  }
}

