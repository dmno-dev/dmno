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

import kleur from 'kleur';

import {
  Cli, Builtins,
} from 'clipanion';


import { LoadCommand } from './commands/load.command';
import { RunCommand } from './commands/run.command';
import { TypeGenCommand } from './commands/typegen.command';


// import packageJson from '../package.json';

process.on('uncaughtException', (err) => {
  console.log(kleur.red(`UNCAUGHT EXCEPTION: ${err.message}`));
  console.log(kleur.red(`UNCAUGHT EXCEPTION: ${err.stack}`));
  // eslint-disable-next-line no-restricted-syntax
  process.exit(1);
});

const cli = new Cli({
  binaryName: 'dmno',
  binaryLabel: kleur.bgGreen('DMNO CLI'),
  binaryVersion: '0.0.1',
});

cli.register(LoadCommand);
cli.register(RunCommand);
cli.register(TypeGenCommand);
cli.register(Builtins.HelpCommand);


try {
  await cli.runExit(process.argv.slice(2));
  process.exit(0);
} catch (error) {
  console.log('unexpected error!', error);
  process.exit(1);
}
