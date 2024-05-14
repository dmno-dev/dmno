import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'path';
import buildEsmResolver from 'esm-resolve';
import kleur from 'kleur';
import { outdent } from 'outdent';
import { input, select, confirm } from '@inquirer/prompts';
import validatePackageName from 'validate-npm-package-name';
import boxen from 'boxen';
import { tryCatch, promiseDelay } from '@dmno/ts-lib';
import { fdir } from 'fdir';
import { PackageManager, ScannedWorkspaceInfo, pathExists } from '../../config-loader/find-services';
import { injectDmnoTypesIntoTsConfig } from './tsconfig-utils';
import { joinAndCompact } from './formatting';
import { findConfigFile, updateConfigFile } from './config-file-updater';
import { getDiffColoredText } from './diff-utils';

const STEP_DELAY = 300;

const DMNO_FOLDER_TSCONFIG = outdent`
  {
    "compilerOptions": {
      "strict": true
    },
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

const CONFIG_MTS_ROOT = (serviceName?: string) => outdent`
  import { DmnoBaseTypes, defineDmnoWorkspace, switchByNodeEnv, NodeEnvType } from 'dmno';

  export default defineDmnoWorkspace({
    ${serviceName ? `name: '${serviceName}'` : '// no name specified - inherit from package.json'},
    schema: {
      NODE_ENV: NodeEnvType, 
      
      MY_SECRET_ITEM: {
        typeDescription: 'Example of a sensitive item that you will pass in via overrides',
        sensitive: true,
        required: true,
      },

      MY_PUBLIC_ITEM: {
        typeDescription: 'Example of a sensitive item that you will pass in via overrides',
        value: 'default value',
      },

      TOGGLED_ITEM: {
        typeDescription: 'some item',
        value: switchByNodeEnv({
          _default: 'default value',
          staging: 'staging value',
          production: 'production value',
        })
      },
    }
  });
`;
const CONFIG_MTS = (serviceName?: string) => outdent`
  import { DmnoBaseTypes, defineDmnoService, switchByNodeEnv } from 'dmno';

  export default defineDmnoService({
    ${serviceName ? `name: '${serviceName}'` : '// no name specified - inherit from package.json'},
    pick: [
      'NODE_ENV',
    ],
    schema: {
    }
  });
`;

function setupStepMessage(message: string, opts?: {
  type?: 'noop' | 'failure' | 'skip',
  path?: string,
  package?: string,
  packageVersion?: string,
  docs?: string,
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
    docsLink && (`   📚${kleur.italic(` see docs @ ${docsLink}`)}`),
  ], '\n');
}


function installPackage(
  packagePath: string,
  packageManager: PackageManager,
  packageName: string,
  isMonoRepoRoot?: boolean,
) {
  // `add` works in all 3, `install` does not
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
  const { packageManager } = workspaceInfo;

  const service = workspaceInfo.workspacePackages.find((s) => s.path === servicePath);
  if (!service) throw new Error('service not found');

  console.log(boxen(
    [
      `Initializing DMNO in workspace ${service.isRoot ? 'root' : 'package'} - ${kleur.magenta(service.name)}`,
      kleur.italic().gray(service.path),
    ].join('\n'),
    {
      padding: 1, borderStyle: 'round', borderColor: 'greenBright',
    },
  ));
  console.log();

  // hidden env flag to force overwriting existing files
  // might make this an actual cli option but not sure if needed
  const overwriteMode = !!process.env.DMNO_INIT_OVERWRITE;

  let packageJsonDeps: Record<string, string> = {};

  async function reloadPackageJson() {
    const packageJsonPath = `${servicePath}/package.json`;
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

  // INSTALL DMNO
  if (!overwriteMode && isDmnoInstalled) {
    console.log(setupStepMessage('dmno already installed', { type: 'noop', package: 'dmno', packageVersion: dmnoVersionRange }));
  } else {
    try {
      installPackage(servicePath, packageManager, 'dmno', workspaceInfo.isMonorepo && service.isRoot);
      await reloadPackageJson();

      console.log(setupStepMessage('dmno installed', { package: 'dmno', packageVersion: packageJsonDeps.dmno }));
    } catch (err) {
      console.log('💥 dmno install failed');
      throw err;
    }
  }

  // CREATE .dmno FOLDER
  await promiseDelay(STEP_DELAY);
  if (service.dmnoFolder) {
    console.log(setupStepMessage('.dmno folder already exists!', { type: 'noop' }));
  } else {
    // create dmno folder
    await fs.promises.mkdir(`${servicePath}/.dmno`);
    console.log(setupStepMessage('.dmno folder created!'));
  }

  // CREATE .dmno/config.mts
  const configMtsPath = `${servicePath}/.dmno/config.mts`;
  if (!overwriteMode && await pathExists(configMtsPath)) {
    await promiseDelay(STEP_DELAY);
    console.log(setupStepMessage('.dmno/config.mts already exists!', { type: 'noop', path: configMtsPath }));
  } else {
    const recommendedName = service.isRoot ? 'root' : service.name.replace(/^@[^/]+\//, '');

    let serviceName: string | undefined = silent ? recommendedName : undefined;
    while (serviceName === undefined) {
      // TODO: better cli input with more options for dynamic help info
      serviceName = await input({
        message: 'What do you want to name this service? (enter "?" for help)',
        default: recommendedName,
        validate(value) {
          // leaving empty will package name from package.json
          if (!value) return true;
          if (value === '?') return true;

          // TODO: better error messages?
          const validationResult = validatePackageName(value);
          if (validationResult.validForNewPackages) return true;
          return validationResult.errors?.[0] || 'invalid name';
        },
      });
      serviceName = serviceName.trim();

      if (serviceName === '?') {
        console.log(boxen([
          'Every "service" in dmno (including the root) has a name (which we refer to as the "service name").',
          '',
          'If you don\'t specify one, we\'ll use the name from your package.json file, but since package names often have a prefix/scope (ex: "@mycoolorg/some-service") and you may need to type this name in a few places - like selecting a service via the dmno CLI - you want to keep it simple.',
          '',
          'You can use our suggestion, write your own name, or delete the default to inherit the name from package.json.',
          '',
          kleur.italic(`you can always change this later by editing ${kleur.blue('.dmno/config.mts')}`),
        ].join('\n'), {
          padding: 1, margin: 1, borderStyle: 'double', title: 'Help - service name',
        }));
        serviceName = undefined;
      }
    }

    await fs.promises.writeFile(
      configMtsPath,
      service.isRoot ? CONFIG_MTS_ROOT(serviceName) : CONFIG_MTS(serviceName),
    );
    console.log(setupStepMessage('.dmno/config.mts created!', { path: configMtsPath }));
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

  // create empty .env.local
  await promiseDelay(STEP_DELAY);
  const envLocalPath = `${service.path}/.dmno/.env.local`;
  if (!overwriteMode && await pathExists(envLocalPath)) {
    console.log(setupStepMessage('.dmno/.env.local already exists!', { type: 'noop', path: envLocalPath }));
  } else {
  // create tsconfig.json
    await fs.promises.writeFile(envLocalPath, ENV_LOCAL);
    console.log(setupStepMessage('.dmno/.env.local created!', { path: envLocalPath }));
  }

  if (service.isRoot) {
    await promiseDelay(STEP_DELAY);
    const gitIgnorePath = `${servicePath}/.gitignore`;

    let gitIgnore = '';
    let createdGitIgnore = false;
    try {
      const rawGitIgnore = await fs.promises.readFile(gitIgnorePath);
      gitIgnore = rawGitIgnore.toString();
    } catch (err) {
      await fs.promises.writeFile(gitIgnorePath, '');
      createdGitIgnore = true;
    }
    // TODO: check for each item rather than all or nothing
    if (gitIgnore.includes('**/.dmno/cache.json')) {
      console.log(setupStepMessage('.gitignore already includes dmno files', { type: 'noop', path: gitIgnorePath }));
    } else {
      gitIgnore += outdent`
        # DMNO files ###
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

  // SET UP TYPESCRIPT
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

  // INSTALL KNOWN INTEGRATIONS
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
          installPackage(servicePath, workspaceInfo.packageManager, suggestedDmnoIntegration.package, false);
          await reloadPackageJson();

          console.log(setupStepMessage(`DMNO + ${knownIntegrationDep} integration installed!`, { package: suggestedDmnoIntegration.package, packageVersion: packageJsonDeps[suggestedDmnoIntegration.package] }));
        }
      }

      // RUN KNOWN INTEGRATIONS CONFIG CODEMODS
      if (packageJsonDeps[suggestedDmnoIntegration.package]) {
        try {
          // import.meta.resolve isn't flexible enough for us at the moment
          const esmResolver = buildEsmResolver(service.path, {
            isDir: true,
            constraints: 'node',
            resolveToAbsolute: true,
          });
          const integrationMetaFile = esmResolver(`${suggestedDmnoIntegration.package}/meta`);
          // TODO: add some typing on the meta provider stuff...
          const metaProvider = await import(integrationMetaFile);
          const configCodeMods = metaProvider.getInstallationCodemods?.();

          const configFileFullPath = await findConfigFile(service.path, configCodeMods.glob);
          const configFileName = configFileFullPath.split('/').pop();
          if (configFileFullPath) {
            const originalConfigFileSrc = (await fs.promises.readFile(configFileFullPath)).toString();
            const updatedConfigFileSrc = await updateConfigFile(originalConfigFileSrc, configCodeMods);

            if (originalConfigFileSrc === updatedConfigFileSrc) {
              console.log(setupStepMessage(`${configFileName} already sets up ${suggestedDmnoIntegration.package}`, { type: 'noop', path: configFileFullPath }));
            } else {
              const diffText = getDiffColoredText(originalConfigFileSrc, updatedConfigFileSrc);

              console.log(kleur.magenta('DMNO will make the following changes to your config file:\n'));
              console.log(boxen(diffText, { title: configFileName }));

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
        } catch (err) {
          console.log(err);
        }
      }
    }
  }

  // SECRETS PLUGINS
  // TODO
  // if (service.isRoot) {}
}
