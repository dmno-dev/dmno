import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import getCallerPath from 'caller-path';

export function loadConfig(
  /** optionally pass in the filename/path of the caller - which may be necessary in some scenarios  */
  filename?: string,
) {
  console.log('loading dmno config');

  // we could be triggering this load from a variety of situations, and we'll need to toggle
  // how we figure out which service we triggered the load from
  // - running via cli
  // - running via a build process, like vite (which will likely need to pass in the filename)
  // - running via a node app (which could be built files or not)

  // console.log({
  //   cwd: process.cwd(),
  //   callerPath: getCallerPath(),
  //   // dirname: __dirname,
  //   // filename: __filename,
  //   filename,
  //   "import.meta.url": import.meta.url,
  // });

  // this is incomplete, but for now we can pass in a filename or we'll try to use caller-path
  let searchFromPath = filename;
  if (!filename) {
    // in theory, this should identify the filename of the function that called this function
    searchFromPath = getCallerPath();
    // when running from vite.config.ts, getCallerPath returns 'node:internal/modules/esm/module_job'
    if (searchFromPath?.startsWith('node:internal')) {
      searchFromPath = undefined;
    }
  }

  if (!searchFromPath) {
    throw new Error('Missing path to start .dmno folder search');
  }

  const loadingFromDir = path.dirname(searchFromPath);
  const dmnoFolder = findDmnoFolder(loadingFromDir);

  const configPath = path.resolve(dmnoFolder, 'config.ts');
  console.log('loading config file - ', configPath);

  const configResult = execSync('pnpm exec dmno load');
  console.log(configResult.toString());

  const config = {
    foo: 1,
  };

  console.log(config);

  return config;
}

function findDmnoFolder(searchFromDir: string) {
  const pathParts = searchFromDir.split('/');


  let dmnoFolderPath: string | undefined;
  while (pathParts.length) {
    const maybeDmnoFolderPath = `${pathParts.join('/')}/.dmno`;
    if (fs.existsSync(maybeDmnoFolderPath)) {
      dmnoFolderPath = maybeDmnoFolderPath;
      break;
    }
    pathParts.pop();
  }
  if (dmnoFolderPath) {
    console.log('found dmno folder!', dmnoFolderPath);
  } else {
    throw new Error('Unable to find .dmno folder');
  }
  return dmnoFolderPath;
}
