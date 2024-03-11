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

process.on('uncaughtException', (err) => {
  // postTelemetryInBackground();
  console.log(pc.red(`UNCAUGHT EXCEPTION: ${err.message}`));
  console.log(pc.red(`UNCAUGHT EXCEPTION: ${err.stack}`));
  // eslint-disable-next-line no-restricted-syntax
  process.exit(1);
});

const cli = new Cli({
  binaryName: 'dmno',
  binaryLabel: pc.bgGreen('DMNO CLI'),
  binaryVersion: '0.0.1',
});

cli.register(LoadCommand);
cli.register(RunCommand);
cli.register(Builtins.HelpCommand);


try {
  await cli.runExit(process.argv.slice(2));
} catch (error) {
  console.log('unexpected error!', error);
  process.exit(1);
}
