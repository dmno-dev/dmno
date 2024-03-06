/**
 * This is the code for the cli executable
 * it doesn't do much itself, mostly just find tsx, and then trigger the cli-entry script via tsx
 * which is what lets us then load all the config files using dynamic imports within the same process
 *
 * alternatively, we'd have to load each config file in a separate process, which would be difficult to coordinate
 *
 * this strategy may not work long-term, but seems like a good place to start
 */

/* eslint-disable no-console */

import path from 'node:path';
import { execSync } from 'node:child_process';
import _ from 'lodash-es';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';


// potentially useful items in process.env
// PNPM_PACKAGE_NAME
// NODE_PATH:

// const CWD = process.cwd();
const thisFilePath = import.meta.url.replace(/^file:\/\//, '');

console.log('> dmno CLI');
// console.log({
//   cwd: process.cwd(),
//   // __dirname,
//   'import.meta.url': import.meta.url,
//   thisFilePath,
// });

// we know the location of this file is the dist folder of @dmno/core within the project's node_modules
// and since tsx is a dependency of @dmno/core, we can assume it will be in node_modules/.bin
// (we will probably need to adjust this to also work with yarn/npm etc...)
const tsxPath = path.resolve(thisFilePath, '../../node_modules/.bin/tsx');
// the cli-entry code will be relative to this file, and we are going to run the built mjs file
// (we could decide to run the ts directly since we are running via tsx)

const dmnoCliEntryPath = path.resolve(thisFilePath, '../cli-entry.mjs');
// const dmnoCliEntryPath = path.resolve(thisFilePath, '../../src/cli-entry.ts');

// console.log({tsxPath, dmnoCliEntryPath, configPath});


await yargs(hideBin(process.argv))
  .command(
    'load',
    'load the dmno config',
    {},
    // (opts?: {
    //   services?: string
    // }) => {
    (argv) => {
      const commandInfo = {
        mode: 'load',
        services: argv?.services,
      };

      console.log(commandInfo);
      // TODO: we'll want to pass through the args/options
      // and any other context info about which service we are within
      const result = execSync(`${tsxPath} ${dmnoCliEntryPath}`);
      console.log(result.toString());
    },
  )
  .option('services', {
    alias: 's',
    type: 'string',
    description: 'Load only specific service(s)',
  })
  .help()
  .demandCommand(1)
  .parse();

