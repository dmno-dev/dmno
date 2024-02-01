import fs from 'node:fs';
import _ from 'lodash';
import async from 'async';
import { execSync, exec, spawn } from 'node:child_process';


console.log('running dmno CLI');

const CWD = process.cwd();

const IS_PNPM = fs.existsSync(`${CWD}/pnpm-lock.yaml`);
if (IS_PNPM) console.log('detected pnpm');
if (!IS_PNPM) throw new Error('Must be run in a pnpm-based monorepo');

// use `pnpm m ls` to list workspace packages
const workspacePackagesRaw = execSync('pnpm m ls --json --depth=-1').toString();
const workspacePackagesData = JSON.parse(workspacePackagesRaw);

// workspace root should have the shortest path, since the others will all be nested
const workspaceRootEntry = _.minBy(workspacePackagesData, (w: {
  name: string;
  version: string;
  path: string;
  private: boolean;
}) => w.path.length)!;

const WORKSPACE_ROOT_PATH = workspaceRootEntry;

const memberPackages = _.omit(_.keyBy(workspacePackagesData, (w) => w.name), workspaceRootEntry.name);
console.log(memberPackages);

// PNPM_SCRIPT_SRC_DIR


// run dev scripts
(async () => {
  await async.eachOf(memberPackages, (member) => {
    runCmd(member.path);
  })
})();

function runCmd(dir: string) {
  console.log('running in dir', dir)
  const ls = spawn('pnpm', ["run dev"], {
    cwd: dir,
    shell: true
  });

  ls.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  ls.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  ls.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  }); 
  return ls;
}






// console.log(process.env);

// console.log();
// pnpm m ls --json --depth=-1 | node -e "const path = require('path'); console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf-8')).map((m) => path.relative(__dirname, m.path)).filter(Boolean))"
