import { execSync } from 'node:child_process';
import fs from 'node:fs';
import kleur from 'kleur';
import _ from 'lodash-es';
import CliTable from 'cli-table3';
import boxen from 'boxen';
import outdent from 'outdent';
import {
  select, input, checkbox, confirm,
} from '@inquirer/prompts';

import { tryCatch } from '@dmno/ts-lib';

import gradient from 'gradient-string';
import { PackageManager, findDmnoServices, pathExists } from '../../config-loader/find-services';
import { DmnoCommand } from '../lib/DmnoCommand';

import { formatError, formattedValue, joinAndCompact } from '../lib/formatting';
import { addServiceSelection } from '../lib/selection-helpers';
import { getCliRunCtx } from '../lib/cli-ctx';
import {
  DMNO_DEV_BANNER, fallingDmnoLoader, fallingDmnosAnimation,
  getDmnoMascot,
} from '../lib/loaders';
import { initDmnoForService } from '../lib/init-helpers';
import { DISCORD_INVITE_URL, GITHUB_REPO_URL } from '../../lib/constants';

const TERMINAL_COLS = process.stdout.columns - 10 || 100;

const program = new DmnoCommand('init')
  .summary('Sets up dmno')
  .description('Sets up dmno in your repo, and can help add to new packages within your monorepo - safe to run multiple times')
  .option('--silent', 'automatically select defaults and do not prompt for any input')
  .example('dmno init', 'Set up dmno and uses interactive menus to make selections');

program.action(async (opts: {
  silent?: boolean,
}, thisCommand) => {
  console.log(DMNO_DEV_BANNER);
  // console.log(kleur.gray('let us help you connect the dots ● ● ●'));

  const [workspaceInfo] = await Promise.all([
    findDmnoServices(true),
    fallingDmnosAnimation(),
  ]);


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
  const rootDmnoFolderExists = await pathExists(`${rootPackage.path}/.dmno`);
  // we may change this logic later?
  const showOnboarding = (workspaceInfo.autoSelectedPackage.isRoot && !rootDmnoFolderExists) || !opts.silent;

  // if in a specific service, we'll just init that service
  if (!workspaceInfo.autoSelectedPackage.isRoot) {
    // ensure dmno has already been set up at the root
    // TODO: we could do some other checks for this too
    if (!rootDmnoFolderExists) {
      console.log('Workspace root .dmno folder does not exist yet... Please run `dmno init` in the root');
      process.exit(1);
    }
    // initialize dmno in this service only
    await initDmnoForService(workspaceInfo, workspaceInfo.autoSelectedPackage.path);

  // if running at the root, we'll init the root and then let the user choose which service(s)
  } else {
    // First run in the root! show some special onboarding stuff...

    if (showOnboarding) {
      console.log('Hello and welcome to dmno!');
    }

    // first initialize in root
    await initDmnoForService(workspaceInfo, rootPackage.path, opts.silent);

    if (workspaceInfo.isMonorepo && !opts.silent) {
      if (workspaceInfo.workspacePackages.length === 1) {
        console.log('No packages found in your monorepo.');
        console.log('After you create them, you can rerun this command `dmno init`');
      } else {
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
    }
  }

  if (showOnboarding) {
    console.log(getDmnoMascot(kleur.bold().yellow('Thank you SO much!')));

    console.log(`\nThis software is ${kleur.green('free')}, and we hope you ${kleur.italic().bold().red('LOVE')} it 😍\n`);

    console.log(joinAndCompact([
      '⭐ If you have a sec, please star us on github',
      kleur.gray('   └ ') + kleur.cyan(GITHUB_REPO_URL),
      ' ',
      '👾 And chat with us on discord!',
      kleur.gray('   └ ') + kleur.cyan(DISCORD_INVITE_URL),
    ], '\n'));

    console.log(joinAndCompact([
      ' ',
      `This is early software that is changing fast and will be shaped by amazing users ${kleur.italic('just like you')}.`,
      "With your consent, we'd love to add you to our email list so we can keep you in the loop.",
      kleur.italic().gray("We promise we won't share your email and we'll only send you really awesome stuff..."),
    ], '\n'));

    const emailOptIn = await confirm({
      message: 'Can we add you to our email list?',
    });
    if (emailOptIn) {
      console.log('💖 Great!');
      // we could use execSync('git config user.email').toString().trim();
      // but feels a little creepy?
      const email = await input({
        message: 'What is your (work) email?',
      });

      console.log('🙏 Thanks so much!\n');

      const userStudyOptIn = await confirm({
        message: 'Would you be up for doing a user study and providing some feedback?',
      });
      if (userStudyOptIn) {
        console.log("🌈 Amazing - we'll be in touch soon!");
      } else {
        console.log('No worries at all...');
        console.log(`If you ever do want to chat hit us up on discord @ ${DISCORD_INVITE_URL}`);
      }

      // TODO: figure out how we want to disable this while we are building/testing this
      const response = await tryCatch(async () => {
        // TODO: would love to use dmno for this URL, but using dmno while _building_ dmno feels like it might be tricky
        return await fetch('https://signup-api.dmno.dev/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            emailOptIn,
            userStudyOptIn,
            source: 'cli',
            // TODO: more info about the current version of cli, system, etc?
          }),
        });
      }, (_err) => {});

      if (response && !response.ok) {
        console.log((await response.json()).message);
      }
    } else {
      console.log('No worries! You can always sign up later at https://dmno.dev');
    }


    console.log(kleur.gray('\nDont worry, you wont see this onboarding stuff again...'));
  }

  console.log(joinAndCompact([
    ' ',
    'For details about how to start defining your config schema:',
    kleur.bold().magenta('https://dmno.dev/docs/guides/schema'),
    ' ',
    'For drop-in integrations to use DMNO with your favorite tools:',
    kleur.bold().magenta('https://dmno.dev/docs/integrations/overview'),
    ' ',
    'For plugins to securely manage your secrets:',
    kleur.bold().magenta('https://dmno.dev/docs/plugins/overview'),
    ' ',
  ], '\n'));


  process.exit(0);
});

export const InitCommand = program;
