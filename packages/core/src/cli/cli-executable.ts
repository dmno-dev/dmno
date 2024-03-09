/**
 * This is the entry point for the cli
 *
 * This file (after being built by tsup) is the `dmno` binary
 *
 * It is responsible for:
 * - handling the cli commands
 * - spinning up the config loader process
 * - communicating with that process to accomplish whatever needs to be done
 * - formatting the result back to the user in the format requested (or exiting with an error code)
 */


import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

import { input } from '@inquirer/prompts';
import {
  Cli, Builtins, Command, Option, runExit,
} from 'clipanion';

import { getThisDirname } from '../lib/this-file-path';

import { LoadCommand } from './commands/load.command';
import { RunCommand } from './commands/run.command';


// import packageJson from '../package.json';

// process.on('uncaughtException', (err) => {
//   // postTelemetryInBackground();
//   console.log(pc.red(`UNCAUGHT EXCEPTION: ${err.message}`));
//   console.log(pc.red(`UNCAUGHT EXCEPTION: ${err.stack}`));
//   // eslint-disable-next-line no-restricted-syntax
//   process.exit(1);
// });

const cli = new Cli({
  binaryName: 'dmno',
  binaryLabel: pc.bgGreen('DMNO CLI'),
  binaryVersion: '0.0.1',
});

cli.register(LoadCommand);
cli.register(RunCommand);
cli.register(Builtins.HelpCommand);

// process.on('SIGKILL', () => {
//   console.log('exit!');
// });
// process.on('SIGINT', () => {
//   console.log('exit!');
// });


// process.stdin.resume(); // so the program will not close instantly

// function exitHandler(options: any, exitCode: any) {
//   if (options?.cleanup) console.log('clean');
//   if (exitCode || exitCode === 0) console.log(exitCode);
//   if (options?.exit) process.exit();
// }

// // do something when app is closing
// process.on('exit', exitHandler.bind(null, { cleanup: true }));

// // catches ctrl+c event
// process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// // catches "kill pid" (for example: nodemon restart)
// process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
// process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

// // catches uncaught exceptions
// process.on('uncaughtException', exitHandler.bind(null, { exit: true }));


try {
  await cli.runExit(process.argv.slice(2));
  process.exit(0);
} catch (error) {
  console.log('unexpected error!', error);
  process.exit(1);
}
