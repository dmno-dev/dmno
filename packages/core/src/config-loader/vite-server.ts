import { fileURLToPath } from 'url';
import { HmrContext, Plugin, createServer } from 'vite';
import { ViteNodeRunner } from 'vite-node/client';
import { ViteNodeServer } from 'vite-node/server';
import { installSourcemapsSupport } from 'vite-node/source-map';
import MagicString from 'magic-string';
import buildEsmResolver from 'esm-resolve';

// we will load the local copy of dmno so we can inject it directly into the vite node module cache
import * as thisDmno from '../index';

// this lets us detect what is the current executing dmno
// const esmResolver = buildEsmResolver(process.cwd(), {
//   isDir: true,
//   constraints: 'node',
//   resolveToAbsolute: true,
// });
// const currentDmnoPath = esmResolver('dmno');

export async function setupViteServer(opts: {
  workspaceRootPath: string,
  hotReloadHandler: (ctx: HmrContext) => Promise<void>,
  enableWatch: boolean
}) {
  const customPlugin: Plugin = {
    name: 'dmno-config-loader-plugin',

    // THIS IS IMPORTANT - it forces our dmno code to be "externalized" rather than bundled
    // otherwise we end up not loading the same code here in this file as within the config files
    // meaning we have 2 copies of classes and `instanceof` stops working
    enforce: 'pre', // Run before the builtin 'vite:resolve' of Vite
    async resolveId(source, importer, options) {
      // console.log('PLUGIN RESOLVE!', source, importer, options);

      if (source === 'dmno') {
        // const resolution = await this.resolve(source, importer, options);
        // console.log('dmno resolution', resolution);
        // if (!resolution) return;

        return {
          id: '\0dmno',
          // pointing at dist/index is hard-coded...
          // we could extract the main entry point from the resolution instead?
          // id: `${opts.workspaceRootPath}/node_modules/dmno/dist/index.js`,
          // id: currentDmnoPath,
          // external: 'absolute',
        };
      }
    },
    async load(id) {
      if (id === '\0dmno') return 'console.log("injected dmno");';
    },

    transform(code, id, options) {
      // fairly naive way of doing this... but for now we are replacing `DMNO_CONFIG.SOME_KEY` with `getResolverCtx().get('SOME_KEY')`
      // TODO: we probably should limit which files this applies in
      const fixedCode = new MagicString(code);
      if (!code.includes("import { getResolverCtx } from 'dmno'")) {
        fixedCode.prepend("import { getResolverCtx } from 'dmno';\n");
      }
      fixedCode.replaceAll(/DMNO_CONFIG\.([\w\d.]+)/g, 'getResolverCtx().get(\'$1\')');

      const map = fixedCode.generateMap({
        source: id,
        file: `${id}.map`,
        includeContent: true,
      }); // generates a v3 sourcemap

      return {
        code: fixedCode.toString(),
        map,
      };
    },

    async handleHotUpdate(ctx) {
      // ignore updates to the generated type files
      if (ctx.file.includes('/.dmno/.typegen/')) return;

      // ignore files outside of the .dmno folder(s)?
      // generally, we shouldn't be reloading the config when the user's app code is updated
      // maybe there are exceptions (package.json? something else?)
      if (!ctx.file.includes('/.dmno/')) return;

      // console.log('hot reload in vite plugin', ctx);

      // clear updated modules out of the cache
      ctx.modules.forEach((m) => {
        if (m.id) viteRunner.moduleCache.deleteByModuleId(m.id);
      });

      await opts.hotReloadHandler(ctx);
    },
  };

  // create vite server
  const originalNodeEnv = process.env.NODE_ENV;
  const server = await createServer({
    root: opts.workspaceRootPath,
    appType: 'custom',
    clearScreen: false,
    logLevel: 'warn',
    plugins: [
      customPlugin,
    ],

    // if the folder we are running in has its own vite.config file, it will try to use it
    // passing false here tells it to skip that process
    configFile: false,
    build: {
    // target: 'esnext',
    // rollupOptions: {
    //   external: 'dmno',
    // },
    //     // external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
    //   },
    // ssr: true,
    },
    // TODO: when watch is enabled, maybe we can we narrow down which files?
    ...!opts.enableWatch && { server: { watch: null } },
  });
  // see https://github.com/vitejs/vite/issues/18712
  if (!originalNodeEnv) delete process.env.NODE_ENV;

  // console.log(server.config);

  // required for plugins
  await server.pluginContainer.buildStart({});

  // create vite-node server
  const node = new ViteNodeServer(server, {
    debug: {
      // dumpModules: true,
    },
  });


  // fixes stacktraces in Errors
  installSourcemapsSupport({
    getSourceMap: (source) => {
      return node.getSourceMap(source);
    },
  });

  // create vite-node runner
  const viteRunner = new ViteNodeRunner({
    debug: true,
    root: server.config.root,
    base: server.config.base,
    // when having the server and runner in a different context
    // you will need to handle the communication between them and pass to this function
    async fetchModule(id) {
      // console.log('fetch module', id);
      return node.fetchModule(id);
    },
    async resolveId(id, importer) {
      // console.log('resolve id', id, importer);
      return node.resolveId(id, importer);
    },
  });

  viteRunner.moduleCache.setByModuleId('\0dmno', {
    promise: thisDmno as any,
  });

  return { viteRunner, viteServer: server };
}
