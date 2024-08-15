import {
  copyFile, rm, cp, writeFile,
} from 'fs/promises';
import { exec } from 'child_process';
import { rollup, RollupBuild } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjsRollupPlugin from '@rollup/plugin-commonjs';
// import typescriptRollupPlugin from '@rollup/plugin-typescript';
import sucraseRollupPlugin from '@rollup/plugin-sucrase';

import kleur from 'kleur';
import _ from 'lodash-es';
import { DmnoCommand } from '../lib/dmno-command';

import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';
import { addCacheFlags } from '../lib/cache-helpers';
import { addWatchMode } from '../lib/watch-mode-helpers';
import { checkForSchemaErrors } from '../lib/check-errors-helpers';
import { CliExitError } from '../lib/cli-error';
import { DmnoBuildInfo } from '../../config-loader/find-services';

const program = new DmnoCommand('build')
  .summary('build compiled dmno config')
  .description('Builds DMNO config files into minimal code appropriate for deployed contexts without access to all dependencies')
  .example('dmno build', 'Build the config using current detected service')
  .example('dmno build --service service1', 'Build dmno config files for use in service1');

addWatchMode(program); // must be first
addCacheFlags(program);
addServiceSelection(program);

program.action(async (opts: {
  // these args should be handled already by the helpers
  // service?: string,
  // watch?: boolean,
  // skipCache?: boolean,
  // clearCache?: boolean,

  format?: string,
  public?: boolean,
  showAll?: boolean,
}, thisCommand) => {
  const ctx = getCliRunCtx();

  if (opts.format) ctx.expectingOutput = true;

  if (!ctx.selectedService) return; // error message already handled

  ctx.log(`\nResolving config for service ${kleur.magenta(ctx.selectedService.serviceName)}\n`);

  const workspace = ctx.workspace!;
  const service = ctx.selectedService;
  checkForSchemaErrors(workspace);

  if (!ctx.configLoader.workspaceInfo.isMonorepo) {
    throw new CliExitError('`dmno build` only works in monorepos');
  }

  const buildDirPath = `${service.path}/.dmno-built`;
  // delete existing build folder
  try {
    await rm(buildDirPath, { recursive: true });
  } catch (err) {}

  if (!ctx.workspace) throw new Error('workspace not loaded');

  // TODO: do we want to write a top level json file with metadata?
  const buildMetadata: DmnoBuildInfo = {
    isMonorepo: ctx.configLoader.workspaceInfo.isMonorepo,
    rootService: ctx.workspace.rootService.serviceName,
    selectedService: ctx.selectedService.serviceName,
  };

  const buildMeta = ctx.workspace.getServiceMetaForBuild(service.serviceName);



  for (const workspaceService of ctx.workspace?.allServices || []) {
    // skip any unrelated services according to the DAG (related via parent or pick)
    if (
      workspaceService !== ctx.selectedService
      && !buildMeta.requiredServices.includes(workspaceService.serviceName)
    ) continue;

    const configFilePath = `${workspaceService.path}/.dmno/config.mts`;
    const buildPackageDirPath = `${buildDirPath}/${workspaceService.serviceName.replaceAll('/', '__')}`;
    console.log('Bundling dmno config file for service ', workspaceService.serviceName);
    console.log('> config file:', configFilePath);
    console.log('> bundled config package dir:', buildPackageDirPath);

    let bundle: RollupBuild | undefined;
    bundle = await rollup({
      input: configFilePath,
      external: ['dmno', /@dmno\/.*/],
      plugins: [
        commonjsRollupPlugin(),
        nodeResolve({
          preferBuiltins: true, // not sure about this - but false and undefined show warnings
        }),

        // typescriptRollupPlugin({
        //   include: ['**/*.{mts,ts}'],
        // }),

        // alternative to @rollup/plugin-typescript which does faster builds without typechecking
        sucraseRollupPlugin({
          include: ['**/*.{mts,ts}'],
          exclude: ['node_modules/**'],
          transforms: ['typescript'],
        }),
      ],
    });

    // write built JS config file
    await bundle.write({
      file: `${buildPackageDirPath}/.dmno/config.js`,
    });
    await bundle?.close();


    // copy vault file(s)
    // TODO: will need to figure out how to generalize this
    // we could copy everything that is not git-ignored?
    // we could let plugins specify a list of patterns to copy
    await exec(`cp ${workspaceService.path}/.dmno/*.vault.json ${buildPackageDirPath}/.dmno`);

    // copy package.json file
    await copyFile(`${workspaceService.path}/package.json`, `${buildPackageDirPath}/package.json`);
  }

  await writeFile(`${buildDirPath}/dmno-build-info.json`, JSON.stringify(buildMetadata, null, 2), 'utf8');
});

export const BuildCommand = program;
