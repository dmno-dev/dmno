import { execSync } from 'child_process';
import fs from 'node:fs';
import kleur from 'kleur';
import { outdent } from 'outdent';
import { input, select } from '@inquirer/prompts';
import validatePackageName from 'validate-npm-package-name';
import boxen from 'boxen';
import { ScannedWorkspaceInfo, pathExists } from '../../config-loader/find-services';


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

function initSuccessMessage(msg: string, opts?: { path?: string }) {
  return [
    `✨${msg}`,
    ...opts?.path ? [kleur.italic().gray(`  ${opts.path}`)] : [],
  ].join('\n');
}

function noopMessage(msg: string) {
  return `✅${msg}`;
}


export async function initDmnoForService(workspaceInfo: ScannedWorkspaceInfo, servicePath: string) {
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

  if (!overwriteMode && await pathExists(`${servicePath}/node_modules/dmno`)) {
    console.log(noopMessage('dmno already installed'));
  } else {
    try {
      const dmnoCoreInstall = execSync(`cd ${servicePath} && ${packageManager} install dmno ${service.isRoot ? '-w' : ''}`);
      console.log(initSuccessMessage('dmno installed'));
    } catch (err) {
      console.log('💥 dmno install failed');
      throw err;
    }
  }



  if (service.dmnoFolder) {
    console.log(noopMessage('.dmno folder already exists!'));
  } else {
    // create dmno folder
    await fs.promises.mkdir(`${servicePath}/.dmno`);
    console.log(initSuccessMessage('.dmno folder created!'));
  }

  // create config.mts
  const configMtsPath = `${servicePath}/.dmno/config.mts`;
  if (!overwriteMode && await pathExists(configMtsPath)) {
    console.log(noopMessage('.dmno/config.mts already exists!'));
  } else {
    console.log(outdent`

      Every "service" in dmno (including the root) has a name (which we refer to as the "service name").

      If you don't specify one, we'll use the name from your package.json file, but since package names often have a prefix/scope (ex: "@mycoolorg/some-service") and we may want to use this name when selecting a service via the dmno CLI, we often want to shorten it.

      You can use our suggestion, write your own name, or delete the default to not specify a name, and the service will inherit the name from its package.json.

      (and don't worry - you can always change this later by editing ${kleur.blue('.dmno/config.mts')})

  `);


    const recommendedName = service.isRoot ? 'root' : service.name.replace(/^@[^/]+\//, '');

    // TODO: better cli input with more options for dynamic help info
    const serviceName = await input({
      message: 'What do you want to name this service?',
      default: recommendedName,
      validate(value) {
        // leaving empty will package name from package.json
        if (!value) return true;

        // TODO: better error messages?
        const validationResult = validatePackageName(value);
        if (validationResult.validForNewPackages) return true;
        return validationResult.errors?.[0] || 'invalid name';
      },
    });

    await fs.promises.writeFile(
      configMtsPath,
      service.isRoot ? CONFIG_MTS_ROOT(serviceName) : CONFIG_MTS(serviceName),
    );
    console.log(initSuccessMessage('.dmno/config.mts created!', { path: configMtsPath }));
  }

  // create tsconfig.json
  const tsConfigPath = `${service.path}/.dmno/tsconfig.json`;
  if (!overwriteMode && await pathExists(tsConfigPath)) {
    console.log(noopMessage('.dmno/tsconfig.json already exists!'));
  } else {
    await fs.promises.writeFile(tsConfigPath, DMNO_FOLDER_TSCONFIG);
    console.log(initSuccessMessage('.dmno/tsconfig.json created!', { path: tsConfigPath }));
  }

  // create empty .env.local
  const envLocalPath = `${service.path}/.dmno/.env.local`;
  if (!overwriteMode && await pathExists(envLocalPath)) {
    console.log(noopMessage('.dmno/.env.local already exists!'));
  } else {
  // create tsconfig.json
    await fs.promises.writeFile(envLocalPath, ENV_LOCAL);
    console.log(initSuccessMessage('.dmno/.env.local created!', { path: envLocalPath }));
  }

  if (service.isRoot) {
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
      console.log(noopMessage('.gitignore already includes dmno files'));
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
      console.log(initSuccessMessage(`.gitignore ${createdGitIgnore ? 'created' : 'updated'} with dmno files!`, { path: gitIgnorePath }));
    }
  }
  console.log('');
}
