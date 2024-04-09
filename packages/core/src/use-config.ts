import util from 'node:util';
import { execSync, exec } from 'child_process';
import _ from 'lodash-es';


const execAsync = util.promisify(exec);


export function getResolvedConfig() {
  try {
    const configResult = execSync('pnpm exec dmno load -f json');
    const configObj = JSON.parse(configResult.toString());
    return configObj;
  } catch (err) {
    // console.log('caught error while trying to load dmno config');
    console.log((err as any).stdout.toString());
    throw err;
  }
}

export function getResolvedConfigForEnvInjection() {
  const config = getResolvedConfig();
  // when injecting into vite config via the `define` option, we need the data in a certain format
  // - each key must be like `import.meta.env.KEY`
  // - values must be JSON.stringified - meaning a string include quotes, for example '"value"'
  return _.transform(config, (acc, itemVal, key) => {
    acc[`import.meta.env.${key.toString()}`] = JSON.stringify(itemVal);

    acc[`DMNO_CONFIG.${key.toString()}`] = JSON.stringify(itemVal);
  }, {} as any);
}

export async function loadProcessDmnoEnv() {
  try {
    const configResult = await execAsync('pnpm exec dmno load -f json');
    const configObj = JSON.parse(configResult.stdout.toString());
    (process as any).dmnoEnv = configObj;
  } catch (err) {
    // console.log('caught error while trying to load dmno config');
    console.log((err as any).stdout.toString());
    throw err;
  }
}
export async function loadProcessDmnoEnvSync() {
  try {
    const configResult = execSync('pnpm exec dmno load -f json');
    const configObj = JSON.parse(configResult.toString());
    (process as any).dmnoEnv = configObj;
  } catch (err) {
    // console.log('caught error while trying to load dmno config');
    console.log((err as any).stdout.toString());
    throw err;
  }
}


// // we could explicitly export a thing to import if it feels better
// // even though it is unnecessary
// export const DMNO_CONFIG = {};

