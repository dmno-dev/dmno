import { execSync } from 'node:child_process';
import fs from 'node:fs';

let err;
try {
  // pnpm m ls --json --depth=-1 | node -e "const path = require('path'); console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf-8')).map((m) => path.relative(__dirname, m.path)).filter(Boolean))"
  const workspacePackagesInfoRaw = execSync('pnpm m ls --json --depth=-1');
  const workspacePackagesInfo = JSON.parse(workspacePackagesInfoRaw);
  // console.log(workspacePackagesInfo);

  // generate sumamry of changed (publishable) modules according to changesets
  // only has option to output to a file
  execSync('pnpm exec changeset status --output=changesets-summary.json');

  const changeSetsSummaryRaw = fs.readFileSync('./changesets-summary.json', 'utf8');
  const changeSetsSummary = JSON.parse(changeSetsSummaryRaw);
  // console.log(changeSetsSummary);

  const releasePackagePaths = changeSetsSummary.releases
    .filter((r) => r.newVersion !== r.oldVersion)
    .map((r) => workspacePackagesInfo.find((p) => p.name === r.name))
    .map((p) => p.path);
  // console.log(releasePackagePaths);

  const publishResult = execSync(`pnpm dlx pkg-pr-new publish --compact ${releasePackagePaths.join(' ')}`);
  console.log('published preview packages!')
  console.log(publishResult);

} catch (_err) {
  err = _err;
  console.error('preview release failed');
  console.error(_err);
}
fs.unlinkSync('./changesets-summary.json');
process.exit(err ? 1 : 0);
