import path from 'path';
import kleur from 'kleur';
import { pathExistsSync } from './fs-utils';

export type JsPackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'deno';

type JsPackageManagerMeta = {
  name: JsPackageManager;
  lockfile: string | string[];
  add: string;
  exec: string;
  dlx: string;
};

export const JS_PACKAGE_MANAGERS: Record<JsPackageManager, JsPackageManagerMeta> = Object.freeze({
  npm: {
    name: 'npm',
    lockfile: 'package-lock.json',
    add: 'npm install', // add also works
    exec: 'npm exec --',
    dlx: 'npx',
  },
  pnpm: {
    name: 'pnpm',
    lockfile: 'pnpm-lock.yaml',
    add: 'pnpm add',
    exec: 'pnpm exec',
    dlx: 'pnpm dlx',
  },
  yarn: {
    name: 'yarn',
    lockfile: 'yarn.lock',
    add: 'yarn add',
    exec: 'yarn exec --',
    dlx: 'yarn dlx',
  },
  bun: {
    name: 'bun',
    lockfile: ['bun.lock', 'bun.lockb'],
    add: 'bun add',
    exec: 'bun run',
    dlx: 'bunx',
  },
  deno: { //! deno not fully supported yet
    name: 'deno',
    lockfile: 'deno.lock',
    add: 'deno add',
    // TODO: don't think these are quite right...
    exec: 'deno run',
    dlx: 'deno run',
  },
});

/**
 * detect js package manager
 *
 * currently go up the folder tree looking for lockfiles (ex: package-lock.json, pnpm-lock.yaml)
 * if nothing found, we'll look at process.env.npm_config_user_agent
 * */
export function detectJsPackageManager(opts?: {
  cwd?: string,
  workspaceRootPath?: string,
}) {
  let cwd = opts?.cwd || process.cwd();
  const cwdParts = cwd.split('/');
  do {
    let pm: JsPackageManager;
    let detectedPm: JsPackageManager | undefined;
    for (pm in JS_PACKAGE_MANAGERS) {
      const lockfiles = Array.isArray(JS_PACKAGE_MANAGERS[pm].lockfile) 
        ? JS_PACKAGE_MANAGERS[pm].lockfile 
        : [JS_PACKAGE_MANAGERS[pm].lockfile as string];

      let lockFileExists = false;
      for (const lockfile of lockfiles) {
        const lockFilePath = path.join(cwd, lockfile);
        if (pathExistsSync(lockFilePath)) {
          lockFileExists = true;
          break;
        }
      }

      if (lockFileExists) {
        // if we find 2 lockfiles at the same level, we throw an error
        if (detectedPm) {
          const currentLockfiles = Array.isArray(JS_PACKAGE_MANAGERS[pm].lockfile) 
            ? (JS_PACKAGE_MANAGERS[pm].lockfile as string[]).join(' or ')
            : JS_PACKAGE_MANAGERS[pm].lockfile;
          const detectedLockfiles = Array.isArray(JS_PACKAGE_MANAGERS[detectedPm].lockfile) 
            ? (JS_PACKAGE_MANAGERS[detectedPm].lockfile as string[]).join(' or ')
            : JS_PACKAGE_MANAGERS[detectedPm].lockfile;
          throw new Error(`Found multiple js package manager lockfiles - ${currentLockfiles} and ${detectedLockfiles}`);
        }
        detectedPm = pm;
      }
    }
    if (detectedPm) return JS_PACKAGE_MANAGERS[detectedPm];

    cwdParts.pop();
    cwd = cwdParts.join('/');
    if (opts?.workspaceRootPath && opts.workspaceRootPath === cwd) break;
  } while (cwd);

  // if we did not find a lockfile, we'll look at env vars for other hints
  if (process.env.npm_config_user_agent) {
    const pmFromAgent = process.env.npm_config_user_agent.split('/')[0];
    if (Object.keys(JS_PACKAGE_MANAGERS).includes(pmFromAgent)) {
      return JS_PACKAGE_MANAGERS[pmFromAgent as JsPackageManager];
    }
  }

  // show some hopefully useful error messaging if we hit the root folder without finding anything
  console.log(kleur.red('Unable to find detect your js package manager!'));
  console.log('We look for lock files (ex: package-lock.json) so you may just need to run a dependency install (ie `npm install`)');
  process.exit(1);
}

