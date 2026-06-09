import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from "node:path";
import readYamlFile from 'read-yaml-file';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MONOREPO_ROOT = path.resolve(__dirname, '..');

let pnpmCatalog;
async function fixPackageJsonCatalogEntries(packageJsonPath) {
  if (!pnpmCatalog) {
    const pnpmWorkspaceYaml = await readYamlFile(path.resolve(__dirname, "../pnpm-workspace.yaml"));
    pnpmCatalog = pnpmWorkspaceYaml.catalog;
  }

  const packageJsonRaw = await fs.promises.readFile(packageJsonPath, 'utf8');
  const packageJsonObj = JSON.parse(packageJsonRaw);

  for (const depObjKey of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const depObj = packageJsonObj[depObjKey];
    if (!depObj) continue;
    for (const depName of Object.keys(depObj)) {
      if (depObj[depName] === 'catalog:') {
        const catalogVersion = pnpmCatalog[depName];
        if (!catalogVersion) throw new Error('Missing pnpm catalog version for ' + depName);
        depObj[depName] = catalogVersion;
      } else if (depObj[depName].startsWith('catalog:')) {
        throw new Error('multiple named catalogs not supported');
      }
    }
  }

  await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJsonObj, null, 2));
}

// Ask bumpy which packages have pending releases (based on bump files in .bumpy/)
function getBumpyReleases() {
  let raw;
  try {
    raw = execSync('pnpm exec bumpy status --json', { cwd: MONOREPO_ROOT }).toString();
  } catch (execErr) {
    // bumpy may exit non-zero with warnings but still print valid JSON
    raw = execErr.stdout?.toString() ?? '';
  }
  // stdout may contain warning lines before the JSON — extract just the JSON object
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  const status = JSON.parse(jsonMatch[0]);
  return status.releases ?? [];
}

let err;
try {
  // On PRs we only want to preview packages bumped in the current branch,
  // ignoring any bump files already sitting on main.
  const isPR = !!process.env.GITHUB_HEAD_REF || !!process.env.GITHUB_BASE_REF;

  const releases = getBumpyReleases()
    // only packages actually published to npm (skips private packages)
    .filter((r) => r.publishTargets?.some((t) => t.type === 'npm'))
    .filter((r) => (isPR ? r.inCurrentBranch : true));

  if (!releases.length) {
    console.log('No preview packages to release!');
    process.exit(0);
  }

  const releasePackagePaths = releases.map((r) => path.resolve(MONOREPO_ROOT, r.dir));
  console.log('Preview packages to release:', releasePackagePaths);

  // Temporary workaround for https://github.com/stackblitz-labs/pkg.pr.new/issues/204
  console.log('replacing pnpm `catalog:*` deps');
  for (const releasePackagePath of releasePackagePaths) {
    await fixPackageJsonCatalogEntries(path.join(releasePackagePath, 'package.json'))
  }

  const publishResult = execSync(`pnpm dlx pkg-pr-new publish --compact --pnpm ${releasePackagePaths.join(' ')}`);
  console.log('published preview packages!')
  console.log(publishResult.toString());

} catch (_err) {
  err = _err;
  console.error('preview release failed');
  console.error(_err);
}
process.exit(err ? 1 : 0);
