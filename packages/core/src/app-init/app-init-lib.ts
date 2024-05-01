import util from 'node:util';
import { execSync, exec } from 'child_process';

const execAsync = util.promisify(exec);

export async function loadGlobalDmnoConfig() {
  // if the process is running via `dmno run`, the full serialized env will be injected
  // so we can get properly typed (instead of all strings) env vars and re-inject into process.dmnoEnv
  if (process.env.DMNO_LOADED_ENV) {
    const parsedLoadedEnv = JSON.parse(process.env.DMNO_LOADED_ENV);

    console.log('loading dmno env from dmno run', parsedLoadedEnv);
    (globalThis as any).DMNO_CONFIG = new Proxy({}, {
      get(o, key) {
        console.log('get dmno config', key);
        return parsedLoadedEnv[key].value;
      },
    });
  } else {
    try {
      const configResult = await execAsync('pnpm exec dmno load -f json');
      const configValuesOnly = JSON.parse(configResult.stdout.toString());
      (globalThis as any).DMNO_CONFIG = new Proxy({}, {
        get(o, key) {
          return configValuesOnly[key];
        },
      });
    } catch (err) {
      // console.log('caught error while trying to load dmno config');
      console.log((err as any).stdout.toString());
      throw err;
    }
  }
}

// TODO: provide sync version?
