import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'path';
import _ from 'lodash-es';
import { parse as parseJSONC, modify as modifyJSONC, applyEdits as applyEditsJSONC } from 'jsonc-parser';
import buildEsmResolver from 'esm-resolve';
import kleur from 'kleur';
import { outdent } from 'outdent';
import { confirm } from '@inquirer/prompts';
import boxen from 'boxen';
import { tryCatch, promiseDelay } from '@dmno/ts-lib';
import { ScannedWorkspaceInfo } from '../../config-loader/find-services';
import { joinAndCompact } from './formatting';
import { findOrCreateConfigFile, updateConfigFile } from './config-file-updater';
import { getDiffColoredText } from './diff-utils';
import { loadServiceDotEnvFiles } from '../../lib/dotenv-utils';
import {
  findEnvVarsInCode, generateDmnoConfigInitialCode, inferDmnoSchema,
} from './schema-scaffold';
import { checkIsFileGitIgnored } from '../../lib/git-utils';
import { detectJsPackageManager, JsPackageManager } from '../../lib/detect-package-manager';
import { pathExists } from '../../lib/fs-utils';

const STEP_DELAY = 300;

const DMNO_FOLDER_TSCONFIG = outdent`
  {
    "extends": "dmno/tsconfigs/dmno-folder",
    "include": [
      "./**/*.mts",
      "./.typegen/global.d.ts"
    ]
  }
`;

const ENV_LOCAL = outdent`
  # 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑
  # DO NOT COMMIT TO VERSION CONTROL
  # This file contains local config overrides, some of which are likely sensitive
  # 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑

  MY_SECRET_ITEM=supersecretkey123

`;

function setupStepMessage(message: string, opts?: {
  type?: 'noop' | 'failure' | 'skip',
  path?: string,
  package?: string,
  packageVersion?: string,
  docs?: string,
  tip?: string,
}) {
  const icon = {
    noop: '✅',
    failure: '🚫',
    skip: '⏭️ ',
    _default: '✨',
  }[opts?.type || '_default'];

  let docsLink = opts?.docs || '';
  if (docsLink && docsLink.startsWith('/')) docsLink = `https://dmno.dev/docs${docsLink}`;

  return joinAndCompact([
    `${icon} ${opts?.type === 'failure' ? kleur.bgRed(message) : message}`,
    opts?.path && ['   📂 ', kleur.italic().gray(opts.path)].join(''),
    opts?.package && [
      '   📦 ',
      kleur.italic().magenta(opts.package),
      opts.packageVersion ? kleur.gray(` @ "${opts.packageVersion}"`) : '',
    ].join(''),
    opts?.tip && `   🚧 ${opts.tip}`,
    !!docsLink && (`   📚 ${kleur.italic(`see docs @ ${docsLink}`)}`),
  ], '\n');
}


function installPackage(
  packagePath: string,
  packageManager: JsPackageManager,
  packageName: string,
  isMonoRepoRoot?: boolean,
) {
  // TODO: use JS_PACKAGE_MANAGERS meta info?
  // `add` works in all of them
  execSync(`cd ${packagePath} && ${packageManager} add ${packageName} ${isMonoRepoRoot && packageManager === 'pnpm' ? '-w' : ''}`);
}


const KNOWN_INTEGRATIONS_MAP: Record<string, { package: string, docs?: string }> = {
  astro: {
    package: '@dmno/astro-integration',
    docs: '/integrations/astro',
  },
  next: {
    package: '@dmno/nextjs-integration',
    docs: '/integrations/nextjs',
  },
  '@remix-run/dev': {
    package: '@dmno/remix-integration',
    docs: '/integrations/remix',
  },
  vite: {
    package: '@dmno/vite-integration',
    docs: '/integrations/vite',
  },
  express: {
    package: 'dmno',
    docs: '/integrations/node',
  },
  koa: {
    package: 'dmno',
    docs: '/integrations/node',
  },
};

export async function initDmnoForService(workspaceInfo: ScannedWorkspaceInfo, servicePath: string, silent?: boolean) {
  const rootPath = workspaceInfo.workspacePackages[0].path;
  const nonRootPaths = workspaceInfo.workspacePackages.slice(1).map((s) => s.path);

  const service = workspaceInfo.workspacePackages.find((s) => s.path === servicePath);
  if (!service) throw new Error('service not found');

  const projectLabel = workspaceInfo.isMonorepo ? `workspace ${service.isRoot ? 'root' : 'package'}` : 'your project';
  console.log(boxen(
    [
      `Initializing dmno in ${projectLabel} - ${kleur.magenta(service.name)}`,
      kleur.italic().gray(service.path),
    ].join('\n'),
    {
      padding: 1, borderStyle: 'round', borderColor: 'greenBright',
    },
  ));

  // hidden env flag to force overwriting existing files
  // might make this an actual cli option but not sure if needed
  const overwriteMode = !!process.env.DMNO_INIT_OVERWRITE;

  let packageJsonDeps: Record<string, string> = {};

  async function reloadPackageJson() {
    const packageJsonPath = `${service!.path}/package.json`;
    const packageJson = await tryCatch(async () => {
      const rawPackageJson = await fs.promises.readFile(packageJsonPath);
      return JSON.parse(rawPackageJson.toString());
    }, (err) => {
      console.log(`Unable to parse ${kleur.green(packageJsonPath)}`);
      throw err;
    });
    packageJsonDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
  }
  await reloadPackageJson();


  const isDmnoInstalled = !!packageJsonDeps.dmno;
  const dmnoVersionRange = packageJsonDeps.dmno;
  // TODO: here we could prompt you to _upgrade_ your version of dmno

  const packageManager = detectJsPackageManager({
    workspaceRootPath: workspaceInfo.workspacePackages[0].path,
  });

  // INSTALL DMNO
  if (!overwriteMode && isDmnoInstalled) {
    console.log(setupStepMessage('dmno already installed', { type: 'noop', package: 'dmno', packageVersion: dmnoVersionRange }));
  } else {
    try {
      installPackage(service.path, packageManager.name, 'dmno', workspaceInfo.isMonorepo && service.isRoot);
      await reloadPackageJson();

      console.log(setupStepMessage('dmno installed', { package: 'dmno', packageVersion: packageJsonDeps.dmno }));
    } catch (err) {
      console.log('💥 dmno install failed');
      throw err;
    }
  }

  // INSTALL KNOWN INTEGRATIONS
  const installedIntegrationPublicPrefixes: Array<string> = [];
  for (const knownIntegrationDep in KNOWN_INTEGRATIONS_MAP) {
    // currently we check dependencies, but we could look for specific config files instead
    if (packageJsonDeps[knownIntegrationDep]) {
      const suggestedDmnoIntegration = KNOWN_INTEGRATIONS_MAP[
        knownIntegrationDep as keyof typeof KNOWN_INTEGRATIONS_MAP
      ];

      if (suggestedDmnoIntegration.package === 'dmno') {
        console.log(setupStepMessage(`DMNO + ${knownIntegrationDep} - natively supported integration`, {
          type: 'noop',
          docs: suggestedDmnoIntegration.docs,
        }));
      } else if (packageJsonDeps[suggestedDmnoIntegration.package]) {
        console.log(setupStepMessage(`DMNO + ${knownIntegrationDep} - integration already installed`, {
          type: 'noop',
          package: suggestedDmnoIntegration.package,
          packageVersion: packageJsonDeps[suggestedDmnoIntegration.package],
          docs: suggestedDmnoIntegration.docs,
        }));
      } else {
        console.log(`It looks like this package uses ${kleur.green(knownIntegrationDep)}!`);
        const confirmIntegrationInstall = await confirm({
          message: `Would you like to install the ${kleur.green(suggestedDmnoIntegration.package)} package?`,
        });

        if (!confirmIntegrationInstall) {
          console.log('No worries - you can always install it later!');
        } else {
          installPackage(service.path, packageManager.name, suggestedDmnoIntegration.package, false);
          await reloadPackageJson();

          console.log(setupStepMessage(`DMNO + ${knownIntegrationDep} integration installed!`, { package: suggestedDmnoIntegration.package, packageVersion: packageJsonDeps[suggestedDmnoIntegration.package] }));
        }
      }

      // RUN KNOWN INTEGRATIONS CONFIG CODEMODS
      if (suggestedDmnoIntegration.package !== 'dmno' && packageJsonDeps[suggestedDmnoIntegration.package]) {
        try {
          // import.meta.resolve isn't flexible enough for us at the moment
          const esmResolver = buildEsmResolver(service.path, {
            isDir: true,
            constraints: 'node',
            resolveToAbsolute: true,
          });
          const integrationMetaFile = esmResolver(`${suggestedDmnoIntegration.package}/meta`);
          if (!integrationMetaFile) {
            throw new Error('Unable to find integration meta info file');
          }
          // TODO: add some typing on the meta provider stuff...
          const integrationMetaRaw = await fs.promises.readFile(integrationMetaFile, 'utf8');
          const integrationMeta = parseJSONC(integrationMetaRaw);

          // track the public env var prefix (ex: `NEXT_PUBLIC_`)
          if (integrationMeta.publicPrefix) {
            installedIntegrationPublicPrefixes.push(integrationMeta.publicPrefix);
          }

          // currently we are assuming only a single codemod and that it will be for a config file
          // but will likely change
          const configCodeMods = integrationMeta.installationCodemods?.[0];

          const { createWithContents, path: configFileFullPath } = await findOrCreateConfigFile(
            service.path,
            configCodeMods.glob,
            configCodeMods.createFileIfNotFound,
          );
          const configFileName = configFileFullPath.split('/').pop();
          if (configFileFullPath) {
            const originalConfigFileSrc = createWithContents ?? await fs.promises.readFile(configFileFullPath, 'utf-8');
            const updatedConfigFileSrc = await updateConfigFile(originalConfigFileSrc, configCodeMods);

            if (originalConfigFileSrc === updatedConfigFileSrc) {
              console.log(setupStepMessage(`${configFileName} already sets up ${suggestedDmnoIntegration.package}`, { type: 'noop', path: configFileFullPath }));
            } else {
              const diffText = getDiffColoredText(createWithContents ? '' : originalConfigFileSrc, updatedConfigFileSrc);
              if (createWithContents) {
                console.log(kleur.italic().bgBlue(` DMNO will create a new ${knownIntegrationDep} config file for you `));
              } else {
                console.log(kleur.italic().bgBlue(' DMNO will make the following changes to your config file '));
              }
              console.log(kleur.italic().gray(`> Filename: ${configFileName}\n`));
              // boxen wasn't handling indentation and line wrapping well
              console.log(diffText.trim());
              console.log(kleur.italic().bgBlue(' -------------------------------------------------------- '));

              const confirmedConfigChanges = await confirm({
                message: 'Continue?',
              });
              if (confirmedConfigChanges) {
                await fs.promises.writeFile(configFileFullPath, updatedConfigFileSrc);
                console.log(setupStepMessage(`${configFileName} updated to set up ${suggestedDmnoIntegration.package}`, { path: configFileFullPath }));
              } else {
                console.log(setupStepMessage(`Skipped ${configFileName} updates to set up ${suggestedDmnoIntegration.package}`, { type: 'skip', path: configFileFullPath }));
              }
            }
          }


          // run package.json script codemods
          const packageScriptsCodemods = integrationMeta.packageScriptsCodemods;
          if (packageScriptsCodemods?.prependDmnoRun) {
            const prependScripts: Record<string, {
              command: string, args?: string
            }> = packageScriptsCodemods.prependDmnoRun;
            const packageJsonPath = `${service.path}/package.json`;
            const packageJsonStr = await fs.promises.readFile(packageJsonPath, 'utf8');
            const packageJson = parseJSONC(packageJsonStr);

            const packageJsonEdits = [] as Array<any>;
            for (const commandName in prependScripts) {
              const existingScriptCmd = packageJson.scripts[commandName];
              if (!existingScriptCmd) continue;
              if (!existingScriptCmd.includes('dmno run')) {
                let argsStr = prependScripts[commandName].args || '';
                if (argsStr && !argsStr.endsWith(' ')) argsStr += ' ';
                const prependedScript = packageJson.scripts[commandName].replace(
                  prependScripts[commandName].command,
                  `dmno run ${argsStr}-- ${prependScripts[commandName].command}`,
                );
                packageJsonEdits.push(...modifyJSONC(packageJsonStr, ['scripts', commandName], prependedScript, {}));
              }
            }

            if (packageJsonEdits.length) {
              const updatedPackageJsonStr = applyEditsJSONC(packageJsonStr, packageJsonEdits);
              const diffText = getDiffColoredText(packageJsonStr, updatedPackageJsonStr);
              console.log(kleur.italic().bgBlue(' DMNO will make the following changes to your package.json scripts'));
              // console.log(kleur.italic().gray(`> Filename: ${configFileName}\n`));
              // boxen wasn't handling indentation and line wrapping well
              console.log(diffText.trim());
              console.log(kleur.italic().bgBlue(' -------------------------------------------------------- '));

              const confirmedConfigChanges = await confirm({
                message: 'Continue?',
              });
              if (confirmedConfigChanges) {
                await fs.promises.writeFile(packageJsonPath, updatedPackageJsonStr);
                console.log(setupStepMessage('package.json scripts prepended with `dmno run`', { path: packageJsonPath }));
              } else {
                console.log(setupStepMessage('Skipped package.json script updates', { type: 'skip', path: configFileFullPath }));
              }
            }
          }
        } catch (err) {
          console.log(err);
        }
      }
      // once we deal with one known integration, we break
      // since some other frameworks user other tools under the hood (like vite)
      break;
    }
  }

  // CREATE .dmno FOLDER
  await promiseDelay(STEP_DELAY);
  if (service.dmnoFolder) {
    // console.log(setupStepMessage('.dmno folder already exists!', { type: 'noop' }));
  } else {
    // create dmno folder
    await fs.promises.mkdir(`${service.path}/.dmno`);
    // console.log(setupStepMessage('.dmno folder created!'));
  }

  const dotEnvFiles = await loadServiceDotEnvFiles(service.path, {
    excludeDirs: service.isRoot ? nonRootPaths : [],
    checkGitIgnored: true,
  });

  // CREATE .dmno/config.mts
  let configFileGenerated = false;
  const configMtsPath = `${service.path}/.dmno/config.mts`;
  if (!overwriteMode && await pathExists(configMtsPath)) {
    await promiseDelay(STEP_DELAY);
    console.log(setupStepMessage('.dmno/config.mts already exists!', { type: 'noop', path: configMtsPath }));
  } else {
    let recommendedServiceName: string | undefined;
    if (workspaceInfo.isMonorepo) {
      if (service.isRoot) recommendedServiceName = 'root';
      else recommendedServiceName = service.name.replace(/^@[^/]+\//, '');
    }
    // we used to prompt the user here to pick/confirm the service name, but it was a bit confusing

    const envVarsFromCode = await findEnvVarsInCode(service.path, {
      excludeDirs: service.isRoot ? nonRootPaths : [],
    });
    const inferredSchema = await inferDmnoSchema(dotEnvFiles, envVarsFromCode, installedIntegrationPublicPrefixes);
    const schemaMtsCode = generateDmnoConfigInitialCode({
      isMonorepo: workspaceInfo.isMonorepo,
      isRoot: service.isRoot,
      serviceName: recommendedServiceName,
      configSchemaScaffold: inferredSchema,
    });
    configFileGenerated = true;

    await fs.promises.writeFile(
      configMtsPath,
      schemaMtsCode,
    );
    console.log(setupStepMessage('.dmno/config.mts created!', {
      path: configMtsPath,
      tip: 'Please review and update this config file!',
    }));
  }

  // clean up dotenv files - delete samples and checked in files
  const committedDotEnvFiles = dotEnvFiles.filter((d) => !d.isGitIgnored);
  if (committedDotEnvFiles.length) {
    await promiseDelay(STEP_DELAY);
    if (configFileGenerated) {
      for (const dotEnvFile of committedDotEnvFiles) {
        console.log(`\nYou no longer need your ${kleur.blue(dotEnvFile.fileName)} file - as we've incorporated it into your new ${kleur.blue('.dmno/config.mts')} file.`);
        const confirmDelete = await confirm({
          message: `Can we delete ${kleur.blue(dotEnvFile.relativePath)}?`,
        });
        if (confirmDelete) {
          await fs.promises.unlink(dotEnvFile.path);
          console.log(setupStepMessage(`deleted dotenv file - ${dotEnvFile.fileName}`, { path: dotEnvFile.path }));
        } else {
          console.log(setupStepMessage(`did NOT delete ${kleur.blue(dotEnvFile.fileName)}`, {
            type: 'skip',
            tip: 'Please delete this file and migrate any useful into your config.mts file',
            path: dotEnvFile.path,
          }));
        }
      }
    } else {
      boxen(
        [
          `We recommend you delete any .env files (including samples) that you have checked into git, and instead incorporate them into your ${kleur.blue('.dmno/config.mts')} file. Please delete these files:`,
          ...committedDotEnvFiles.map((f) => `  - ${kleur.blue(f.relativePath)}`),
        ].join('\n'),
        {
          padding: 1, borderStyle: 'round', borderColor: 'redBright',
        },
      );
    }
  }

  const ignoredDotEnvFiles = dotEnvFiles.filter((d) => d.isGitIgnored && !d.path.includes('/.dmno/'));
  if (ignoredDotEnvFiles.length) {
    await promiseDelay(STEP_DELAY);
    console.log('\nTo avoid potential issues and confusion, we recommend you move any .env file(s) into your .dmno folder and load them via dmno.');

    for (const dotEnvFile of ignoredDotEnvFiles) {
      const confirmMove = await confirm({
        message: `Can we move ${kleur.blue(dotEnvFile.relativePath)}?`,
      });

      const newPath = `${service.path}/.dmno/${dotEnvFile.fileName}`;

      if (confirmMove) {
        await fs.promises.rename(dotEnvFile.path, newPath);
        // make sure that if the file was gitignored before the move that it still is - we don't want to help the user accidentally commit secrets
        // .env.local will be handled by the root gitignore since we always are creating those files
        if (dotEnvFile.fileName !== '.env.local' && dotEnvFile.isGitIgnored && !(await checkIsFileGitIgnored(newPath))) {
          await fs.promises.appendFile(`${service.path}/.gitignore`, `\n./.dmno/${dotEnvFile.fileName}`);
        }
        console.log(setupStepMessage(`moved ${kleur.blue(dotEnvFile.relativePath)} to .dmno folder`, { path: newPath }));
      } else {
        console.log(setupStepMessage(`did NOT move ${kleur.blue(dotEnvFile.fileName)}`, {
          type: 'skip',
          tip: 'Please move this file into the .dmno folder',
          path: dotEnvFile.path,
        }));
      }
    }
  }

  // create empty .env.local
  await promiseDelay(STEP_DELAY);
  const envLocalPath = `${service.path}/.dmno/.env.local`;
  if (!overwriteMode && await pathExists(envLocalPath)) {
    console.log(setupStepMessage('.dmno/.env.local already exists!', { type: 'noop', path: envLocalPath }));
  } else {
    await fs.promises.writeFile(envLocalPath, ENV_LOCAL);
    console.log(setupStepMessage('.dmno/.env.local created!', { path: envLocalPath }));
  }



  // CREATE .dmno/tsconfig.json
  await promiseDelay(STEP_DELAY);
  const tsConfigPath = `${service.path}/.dmno/tsconfig.json`;
  if (!overwriteMode && await pathExists(tsConfigPath)) {
    console.log(setupStepMessage('.dmno/tsconfig.json already exists!', { type: 'noop', path: tsConfigPath }));
  } else {
    await fs.promises.writeFile(tsConfigPath, DMNO_FOLDER_TSCONFIG);
    console.log(setupStepMessage('.dmno/tsconfig.json created!', { path: tsConfigPath }));
  }


  if (service.isRoot) {
    await promiseDelay(STEP_DELAY);
    const gitIgnorePath = `${servicePath}/.gitignore`;

    let gitIgnore = '';
    let createdGitIgnore = false;
    try {
      gitIgnore = await fs.promises.readFile(gitIgnorePath, 'utf8');
    } catch (err) {
      await fs.promises.writeFile(gitIgnorePath, '');
      createdGitIgnore = true;
    }
    // TODO: check for each item rather than all or nothing
    // TODO: show some kind of warning if user is not within a git repo
    if (gitIgnore.includes('**/.dmno/cache.json')) {
      console.log(setupStepMessage('.gitignore already includes dmno files', { type: 'noop', path: gitIgnorePath }));
    } else {
      gitIgnore += '\n';
      gitIgnore += outdent`
        # dmno files ###
        # local cache for resolved values
        **/.dmno/cache.json
        # encryption key used for cache
        **/.dmno/cache-key.json
        # generated type files
        **/.dmno/.typegen
        # iconify cache used in generated types
        **/.dmno/.icon-cache
        # local config overrides
        **/.dmno/.env.local
      `;
      await fs.promises.writeFile(gitIgnorePath, gitIgnore);
      console.log(setupStepMessage(`.gitignore ${createdGitIgnore ? 'created' : 'updated'} with dmno files!`, { path: gitIgnorePath }));
    }
  }

  // SET UP TYPESCRIPT dmno-env.d.ts file
  let srcDirPath = `${service.path}/src`;
  if (!fs.existsSync(srcDirPath)) srcDirPath = service.path;
  const dmnoEnvFilePath = `${srcDirPath}/dmno-env.d.ts`;
  if (fs.existsSync(dmnoEnvFilePath)) {
    console.log(setupStepMessage('injecting dmno types - dmno-env.d.ts already exists', {
      type: 'noop',
      path: dmnoEnvFilePath,
      docs: '/guides/typescript',
    }));
  } else {
    let globalDtsRelativePath = path.relative(srcDirPath, `${service.path}/.dmno/.typegen/global.d.ts`);
    if (globalDtsRelativePath.startsWith('.dmno')) globalDtsRelativePath = `./${globalDtsRelativePath}`;
    await fs.promises.writeFile(dmnoEnvFilePath, outdent`
      // inject DMNO_CONFIG global
      /// <reference types="${globalDtsRelativePath}" />
      // inject DMNO_PUBLIC_CONFIG global
      /// <reference types="${globalDtsRelativePath.replace('global.d.ts', 'global-public.d.ts')}" />

    `);
    console.log(setupStepMessage('injecting dmno types - created dmno-env.d.ts file', {
      path: dmnoEnvFilePath,
      docs: '/guides/typescript',
    }));
  }

  // const tsConfigFiles = await (
  //   new fdir() // eslint-disable-line new-cap
  //     .withRelativePaths()
  //     .glob('./tsconfig.json', './tsconfig.*.json', 'jsconfig.json')
  //     .withMaxDepth(0)
  //     .crawl(service.path)
  //     .withPromise()
  // );
  // if (!tsConfigFiles.length) {
  //   console.log(setupStepMessage('Failed to inject dmno types - no tsconfig/jsconfig found', {
  //     type: 'failure',
  //     docs: '/guides/typescript',
  //   }));
  // }
  // for (const tsConfigFileName of tsConfigFiles) {
  //   const tsConfigPath = `${service.path}/${tsConfigFileName}`;
  //   const originalTsConfigContents = (await fs.promises.readFile(tsConfigPath)).toString();
  //   const updatedTsConfigContents = await injectDmnoTypesIntoTsConfig(originalTsConfigContents);
  //   if (updatedTsConfigContents) {
  //     // TODO: maybe want to confirm with the user and show a diff?
  //     await fs.promises.writeFile(tsConfigPath, updatedTsConfigContents);

  //     console.log(setupStepMessage(`injected dmno types into ${tsConfigFileName}`, {
  //       path: tsConfigPath,
  //       // docs: suggestedDmnoIntegration.docs,
  //     }));
  //   } else {
  //     console.log(setupStepMessage('tsconfig already includes dmno types', {
  //       type: 'noop',
  //       path: tsConfigPath,
  //       // docs: suggestedDmnoIntegration.docs,
  //     }));
  //   }
  // }


  // SECRETS PLUGINS
  // TODO
  // if (service.isRoot) {}
}
