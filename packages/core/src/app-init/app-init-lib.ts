import util from 'node:util';
import { execSync, exec } from 'child_process';

const execAsync = util.promisify(exec);

export async function loadGlobalDmnoConfig() {
  // if the process is running via `dmno run`, the full serialized env will be injected
  // so we can get properly typed (instead of all strings) env vars and re-inject into process.dmnoEnv
  if (!process.env.DMNO_LOADED_ENV) {
    throw new Error('Unable to find injected DMNO config - run this code via `dmno run` - see https://dmno.dev/docs/reference/cli/run for more info');

    // TODO: we can call out to the CLI instead
  }

  const parsedLoadedEnv = JSON.parse(process.env.DMNO_LOADED_ENV);

  (globalThis as any).DMNO_CONFIG = new Proxy({}, {
    get(o, key) {
      if (!(key in parsedLoadedEnv)) {
        throw new Error(`Config item \`${key.toString()}\` does not exist`);
      }
      return parsedLoadedEnv[key].value;
    },
  });
  (globalThis as any).DMNO_PUBLIC_CONFIG = new Proxy({}, {
    get(o, key) {
      if (!(key in parsedLoadedEnv)) {
        throw new Error(`Config item \`${key.toString()}\` does not exist`);
      }
      if (parsedLoadedEnv[key].sensitive) {
        throw new Error(`Config item \`${key.toString()}\` is sensitive - use \`DMNO_CONFIG.${key.toString()}\` instead`);
      }
      return parsedLoadedEnv[key].value;
    },
  });
}

// TODO: provide sync version?
