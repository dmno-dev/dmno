import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import _ from 'lodash-es';
import { DmnoRunCommandInfo } from '../../cli-entry';

const thisFilePath = import.meta.url.replace(/^file:\/\//, '');

// we know the location of this file is the dist folder of @dmno/core within the project's node_modules
// and since tsx is a dependency of @dmno/core, we can assume it will be in node_modules/.bin
// (we will probably need to adjust this to also work with yarn/npm etc...)
const tsxPath = path.resolve(thisFilePath, '../../../node_modules/.bin/tsx');
// the cli-entry code will be relative to this file, and we are going to run the built mjs file
// (we could decide to run the ts directly since we are running via tsx)

const dmnoCliEntryPath = path.resolve(thisFilePath, '../../cli-entry.mjs');


export function loadDmnoConfig(service?: string) {
  const commandInfo: DmnoRunCommandInfo = {
    command: 'load',
    format: 'json',
    service,
  };

  try {
    const result = execFileSync(tsxPath, [dmnoCliEntryPath, JSON.stringify(commandInfo)], {
      // stdio: 'inherit',
      // env: process.env, // default already passes through process.env
    });

    // TODO: this is really dumb... just a temporary solution to get the data
    // without turning off all the rest of the logging
    const envJson = result.toString().split('-----------------------------------------').pop();
    const env = JSON.parse(envJson || '{}');
    return env;
  } catch (err) {
    console.log('caught error', err);
    process.exit(1);
  }
}

