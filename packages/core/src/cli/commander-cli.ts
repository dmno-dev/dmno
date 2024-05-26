#!/usr/bin/env node
// hashbang needed to get npm generated ".bin/dmno" to work with esm imports

/* eslint-disable import/first */
// import first - we add global exception handler here
const startBoot = new Date().getTime();

import './lib/init-process';

import _ from 'lodash-es';
import kleur from 'kleur';
import Debug from 'debug';
import { DmnoCommand } from './lib/DmnoCommand';

import { addDocsCommand } from './lib/cli-schema-generation';
import { customizeHelp } from './lib/help-customizations';
import { initCliRunCtx } from './lib/cli-ctx';

import { ResolveCommand } from './commands/resolve.command';
import { RunCommand } from './commands/run.command';
import { DevCommand } from './commands/dev.command';
import { PluginCommand } from './commands/plugin.command';
import { InitCommand } from './commands/init.command';
import { ClearCacheCommand } from './commands/clear-cache.command';



const debug = Debug('dmno:cli');

const program = new DmnoCommand('dmno')
  .description('dmnno cli - https://dmno.dev')
  .version('0.0.1');

program.addCommand(ResolveCommand);
program.addCommand(RunCommand);
program.addCommand(DevCommand);
program.addCommand(InitCommand);
program.addCommand(ClearCacheCommand);
program.addCommand(PluginCommand);



// have to pass through the root program for this one so we can access all the subcommands
addDocsCommand(program);

customizeHelp(program);

initCliRunCtx();
debug(`finish loading - begin parse ${+new Date() - startBoot}ms`);
await program.parseAsync();
