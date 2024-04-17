import { exec } from 'node:child_process';
import util from 'node:util';
import _ from 'lodash-es';

const execAsync = util.promisify(exec);


// currently assuming we are using pnpm, and piggybacking off of how they discover "packages" in pnpm-workspace.yaml
// we'll want to to do smarter detection and also support yarn/npm/etc as well as our own list of services defined at the root

// TODO: need smarter detection of pnpm monorepo?
// const IS_PNPM = fs.existsSync(`${CWD}/pnpm-lock.yaml`);
// if (IS_PNPM) console.log('detected pnpm');
// if (!IS_PNPM) throw new Error('Must be run in a pnpm-based monorepo');


export type PnpmPackageListing = {
  name: string;
  version: string;
  path: string;
  private: boolean;
};

// using `pnpm m ls` to list workspace packages

export async function findDmnoServices() {
  // TODO: this is likely slower than trying to do this ourselves?
  const workspacePackagesRaw = await execAsync('pnpm m ls --json --depth=-1');
  const workspacePackagesData = JSON.parse(workspacePackagesRaw.stdout) as Array<PnpmPackageListing>;
  // workspace root should have the shortest path, since the others will all be nested
  const workspaceRootEntry = _.minBy(workspacePackagesData, (w) => w.path.length)!;
  const WORKSPACE_ROOT_PATH = workspaceRootEntry.path;

  return { workspacePackagesData, WORKSPACE_ROOT_PATH };
}
