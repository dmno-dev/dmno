import fs from 'fs';
import path from 'path';
import kleur from 'kleur';
import { asyncMapValues } from './async-utils';


// TODO: move PACKAGE_MANAGER_RELEVANT_FILES into this
export const PACKAGE_MANAGERS_META = {
  npm: {
    exec: 'npm exec',
    dlx: 'npx',
  },
  yarn: {
    exec: 'yarn exec',
    dlx: 'yarn dlx',
  },
  pnpm: {
    exec: 'pnpm exec',
    dlx: 'pnpm dlx',
  },
  bun: {
    exec: 'bun run',
    dlx: 'bunx',
  },
  moon: {
    // TODO: fix this... we'll need to track the fact that the user is using moon and a package manager
    exec: 'npm exec',
    dlx: 'npx',
  },
} as const;
export type PackageManager = keyof typeof PACKAGE_MANAGERS_META;



export async function pathExists(p: string) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}
function pathExistsSync(p:string) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

// TODO: nx and lerna support? (lerna.json has packages array)
// TODO: deno?
const PACKAGE_MANAGER_RELEVANT_FILES = {
  packageJson: 'package.json',
  yarnLock: 'yarn.lock',
  npmLock: 'package-lock.json',
  pnpmLock: 'pnpm-lock.yaml',
  pnpmWorkspace: 'pnpm-workspace.yaml',
  bunLock: 'bun.lockb',
  moonWorkspace: '.moon/workspace.yml',
};

// SEE SYNC VERSION BELOW - UPDATE BOTH IF ANY CHANGES ARE MADE!
export async function detectPackageManager() {
  let cwd = process.cwd();
  const cwdParts = cwd.split('/');

  let packageManager: PackageManager | undefined;
  let possibleRootPackage: string | undefined;

  while (!packageManager) {
    // we could also try to detect the current package manager via env vars (ex: process.env.PNPM_PACKAGE_NAME)
    // and then not check for all of the lockfiles...?


    const filesFound = await asyncMapValues(
      PACKAGE_MANAGER_RELEVANT_FILES,
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      async (filePath) => pathExists(path.resolve(cwd, filePath)),
    );

    if (filesFound.packageJson) possibleRootPackage = cwd;

    if (filesFound.pnpmLock || filesFound.pnpmWorkspace) packageManager = 'pnpm';
    else if (filesFound.npmLock) packageManager = 'npm';
    else if (filesFound.yarnLock) packageManager = 'yarn';
    else if (filesFound.bunLock) packageManager = 'bun';
    else if (filesFound.moonWorkspace) packageManager = 'moon';

    if (!packageManager) {
      cwdParts.pop();
      cwd = cwdParts.join('/');
    }
    // show some hopefully useful error messaging if we hit the root folder without finding anything
    if (cwd === '') {
      console.log(kleur.red('Unable to find detect your package manager and workspace root!'));
      if (possibleRootPackage) {
        console.log(`But it looks like your workspace root might be ${kleur.green().italic(possibleRootPackage)}`);
      }
      console.log('We look for lock files (ex: package-lock.json) so you may just need to run a dependency install (ie `npm install`)');
      process.exit(1);
    }
  }


  return {
    packageManager,
    rootWorkspacePath: cwd,
  };
}


// sync version of above fn, probably dont want this... but fine for now
export function detectPackageManagerSync() {
  let cwd = process.cwd();

  const cwdParts = cwd.split('/');

  let packageManager: PackageManager | undefined;
  let possibleRootPackage: string | undefined;

  while (!packageManager) {
    // we could also try to detect the current package manager via env vars (ex: process.env.PNPM_PACKAGE_NAME)
    // and then not check for all of the lockfiles...?

    const filesFound: Partial<Record<keyof typeof PACKAGE_MANAGER_RELEVANT_FILES, boolean>> = {};
    for (const fileKey of Object.keys(PACKAGE_MANAGER_RELEVANT_FILES)) {
      const key = fileKey as keyof typeof PACKAGE_MANAGER_RELEVANT_FILES;
      const filePath = path.resolve(cwd, PACKAGE_MANAGER_RELEVANT_FILES[key]);
      filesFound[key] = pathExistsSync(filePath);
    }

    if (filesFound.packageJson) possibleRootPackage = cwd;

    if (filesFound.pnpmLock || filesFound.pnpmWorkspace) packageManager = 'pnpm';
    else if (filesFound.npmLock) packageManager = 'npm';
    else if (filesFound.yarnLock) packageManager = 'yarn';
    else if (filesFound.bunLock) packageManager = 'bun';
    else if (filesFound.moonWorkspace) packageManager = 'moon';

    if (!packageManager) {
      cwdParts.pop();
      cwd = cwdParts.join('/');
    }
    // show some hopefully useful error messaging if we hit the root folder without finding anything
    if (cwd === '') {
      console.log(kleur.red('Unable to find detect your package manager and workspace root!'));
      if (possibleRootPackage) {
        console.log(`But it looks like your workspace root might be ${kleur.green().italic(possibleRootPackage)}`);
      }
      console.log('We look for lock files (ex: package-lock.json) so you may just need to run a dependency install (ie `npm install`)');
      process.exit(1);
    }
  }

  return {
    packageManager,
    rootWorkspacePath: cwd,
  };
}




