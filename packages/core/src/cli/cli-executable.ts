#!/usr/bin/env node
// hashbang needed to get npm generated ".bin/dmno" to work with esm imports

import './lib/init-process';

/* eslint-disable import/first */
// import first - we add global exception handler here
const startBoot = new Date().getTime();
const cliExecId = new Date().toISOString();

import * as _ from 'lodash-es';
import Debug from 'debug';
import { DmnoCommand } from './lib/dmno-command';
// import {Completion, script} from "tab";

import { addDocsCommand } from './lib/cli-schema-generation';
import { customizeHelp } from './lib/help-customizations';
import { getCliRunCtx, initCliRunCtx } from './lib/cli-ctx';
import { CliExitError } from './lib/cli-error';
import { WATCHING_FILES_MESSAGE } from './lib/watch-mode-helpers';


import { ResolveCommand } from './commands/resolve.command';
import { RunCommand } from './commands/run.command';
import { DevCommand } from './commands/dev.command';
import { PluginCommand } from './commands/plugin.command';
import { InitCommand } from './commands/init.command';
import { ClearCacheCommand } from './commands/clear-cache.command';
import { PrintEnvCommand } from './commands/printenv.command';
import { CompleteCommand } from './commands/complete.command.ts';

const debug = Debug('dmno:cli');

const program = new DmnoCommand('dmno')
  .description('dmnno cli - https://dmno.dev')
  .version('0.0.1');

program.enablePositionalOptions();

program.addCommand(ResolveCommand);
program.addCommand(RunCommand);
program.addCommand(DevCommand);
program.addCommand(InitCommand);
program.addCommand(ClearCacheCommand);
program.addCommand(PluginCommand);
program.addCommand(PrintEnvCommand);
program.addCommand(CompleteCommand);

// have to pass through the root program for this one so we can access all the subcommands
addDocsCommand(program);
customizeHelp(program);

program
  .hook('preAction', (thisCommand, actionCommand) => {
    // init command does not need a dmno server
    // might want to opt-in on each command instead of skipping here?
    if (actionCommand.name() === 'init') return;

    // we need to know up front whether to enable the file watchers when initializing the vite server
    initCliRunCtx({
      // TODO: a bit awkward how this is being set up
      createParentServer: ['dev', 'run'].includes(actionCommand.name()),
      enableWebUi: actionCommand.name() === 'dev',
      watch: actionCommand.name() === 'dev' || actionCommand.opts().watch,
    });
  });

process.on('exit', () => {
  debug(`cli execution (${cliExecId}) took ${+new Date() - +startBoot}ms`);
});

debug(`finish loading - begin parse ${+new Date() - startBoot}ms`);
try {
  await program.parseAsync();
} catch (err) {
  // if we are on our first run and we hit an error, our watch-mode post-hook never fires
  // so we must recreate that logic... can clean this up if it gets more complicated
  if (err instanceof CliExitError) {
    console.error(err.getFormattedOutput());

    const ctx = getCliRunCtx();
    if (ctx.watchEnabled && !err.forceExit) {
      console.log(WATCHING_FILES_MESSAGE);
    } else {
      process.exit(1);
    }
  } else {
    throw err;
  }
}
