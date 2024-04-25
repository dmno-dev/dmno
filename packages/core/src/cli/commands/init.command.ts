import { execSync } from 'node:child_process';
import fs from 'node:fs';
import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import boxen from 'boxen';
import outdent from 'outdent';
import { select, input, checkbox } from '@inquirer/prompts';

import { tryCatch } from '@dmno/ts-lib';

import { PackageManager, findDmnoServices, pathExists } from '../../config-loader/find-services';
import { DmnoCommand } from '../lib/DmnoCommand';

import { formatError, formattedValue } from '../lib/formatting';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';
import { fallingDmnoLoader } from '../lib/loaders';
import { initDmnoForService } from '../lib/init-helpers';

const TERMINAL_COLS = process.stdout.columns - 10 || 100;

const program = new DmnoCommand('init')
  .summary('Sets up dmno')
  .description('Sets up dmno in your repo, and can help add to new packages within your monorepo - safe to run multiple times')
  .example('dmno init', 'Set up dmno and uses interactive menus to make selections');

program.action(async (opts: {
}, thisCommand) => {
  const [workspaceInfo] = await Promise.all([
    findDmnoServices(true),
    fallingDmnoLoader('● Scanning repo', '● Scan complete'),
  ]);
  // const workspaceInfo = ;

  // await fallingDmnoLoader('● Scanning repo', '● Scan complete');

  const rootPath = workspaceInfo.workspacePackages[0].path;

  console.log();
  console.log(kleur.gray(`- Package manager: ${workspaceInfo.packageManager}`));
  console.log(kleur.gray(`- Workspace root path: ${rootPath}`));
  console.log(kleur.gray(`- Monorepo mode: ${workspaceInfo.isMonorepo ? 'ENABLED' : 'DISABLED'}`));
  if (workspaceInfo.isMonorepo) {
    console.log(kleur.gray(`- Total Packages Count: ${workspaceInfo.workspacePackages.length}`));
  }
  console.log();

  // console.log(boxen(`Welcome to ${kleur.magenta('DMNO!')}`, { padding: 1, borderStyle: 'round', borderColor: 'greenBright' }));
  // console.log(kleur.italic().green("We're here to help you connect the dots ● ● ● "));
  // console.log('');

  const rootPackage = workspaceInfo.workspacePackages[0];

  if (!workspaceInfo.autoSelectedPackage) {
    throw new Error('unable to detect which package you are in... whats happening?');
  }

  // if in a specific service, we'll just init that service
  if (!workspaceInfo.autoSelectedPackage.isRoot) {
    // ensure dmno has already been set up at the root
    // TODO: we could do some other checks for this too
    if (!await pathExists(`${rootPackage.path}/.dmno`)) {
      console.log('Workspace root .dmno folder does not exist yet... Please run `dmno init` in the root');
      process.exit(1);
    }
    // initialize dmno in this service only
    await initDmnoForService(workspaceInfo, workspaceInfo.autoSelectedPackage.path);

  // if running at the root, we'll init the root and then let the user choose which service(s)
  } else {
    // first initialize in root
    await initDmnoForService(workspaceInfo, rootPackage.path);
    // then let user select service(s) to init
    console.log();
    const installPackagePaths = await checkbox({
      message: 'Which service(s) would you like to initialize as dmno services?\n',
      choices: workspaceInfo.workspacePackages.slice(1).map((packageInfo) => {
        return {
          value: packageInfo.path,
          name: `${packageInfo.name} - ${kleur.italic().gray(packageInfo.relativePath)}`,
        };
      }),
    });
    for (const packagePath of installPackagePaths) {
      await initDmnoForService(workspaceInfo, packagePath);
    }
  }

  process.exit(0);
});

export const InitCommand = program;
