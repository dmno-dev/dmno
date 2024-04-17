import util from 'node:util';
import { execSync, exec } from 'child_process';

const execAsync = util.promisify(exec);

export async function loadProcessDmnoEnv() {
  // if the process is running via `dmno run`, the full serialized env will be injected
  // so we can get properly typed (instead of all strings) env vars and re-inject into process.dmnoEnv
  if (process.env.DMNO_LOADED_ENV) {
    const parsedEnv = JSON.parse(process.env.DMNO_LOADED_ENV);
    (process as any).dmnoEnv = parsedEnv;
    return;
  }

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

// exact same as above but sync version
export async function loadProcessDmnoEnvSync() {
  if (process.env.DMNO_LOADED_ENV) {
    const parsedEnv = JSON.parse(process.env.DMNO_LOADED_ENV);
    (process as any).dmnoEnv = parsedEnv;
    return;
  }

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
