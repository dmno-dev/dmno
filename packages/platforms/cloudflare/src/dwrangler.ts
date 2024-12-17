/**
 * small wrapper around the wrangler cli to help inject DMNO config
 * ideally we could inject using other methods,
 * - we dont want to write resolved config to local temp files
 * - using xargs in complex scenarios proved very awkward
 * - making users change their scripts to long complicated things isn't great
 */

import {
  ChildProcess, spawn,
} from 'node:child_process';
import { execa } from 'execa';
import { checkServiceIsValid, DmnoServer, InjectedDmnoEnv } from 'dmno';
import Debug from 'debug';
import { CloudflareWranglerEnvSchema, DmnoWranglerEnvSchema } from './data-types';

const debug = Debug('dmno:dwrangler');

const args = process.argv.slice(2);
let wranglerCommand = args[0];
if (['versions', 'pages'].includes(wranglerCommand)) wranglerCommand += ` ${args[1]}`;

// TODO: more bulletproof way of finding this
const wranglerBinPath = './node_modules/.bin/wrangler';

const isDevMode = ['dev', 'pages dev'].includes(wranglerCommand);
const isBuildMode = ['deploy', 'versions upload'].includes(wranglerCommand);

let injectedDmnoEnv: InjectedDmnoEnv;
let injectedProcessEnv = {} as Record<string, string | undefined>;
let injectedValues = {} as Record<string, any>;
let injectedDynamicValues = {} as Record<string, any>;
let dmnoHasTriggeredReload = false;
let dmnoConfigValid = true;
let wranglerSystemEnv: Record<string, string> = {};
let dmnoWranglerSettings: Record<string, string> = {};
const staticReplacements = {
  dmnoConfig: {} as Record<string, string>,
  dmnoPublicConfig: {} as Record<string, string>,
};

const wranglerSystemEnvKeys = Object.keys(CloudflareWranglerEnvSchema);
const dmnoWranglerEnvKeys = Object.keys(DmnoWranglerEnvSchema);

// pass back some info about the current run into the dmno config
// TODO: ideally we'd pass this in as overrides explcitly with a different source rather than using process.env
process.env.WRANGLER_DEV_ACTIVE = isDevMode ? 'true' : 'false';
process.env.WRANGLER_BUILD_ACTIVE = isBuildMode ? 'true' : 'false';

const dmnoServer = new DmnoServer({ watch: isDevMode });

async function reloadDmnoConfig() {
  const resolvedService = await dmnoServer.getCurrentPackageConfig();
  injectedProcessEnv = resolvedService.injectedProcessEnv;
  injectedDmnoEnv = resolvedService.injectedDmnoEnv;
  dmnoConfigValid = resolvedService.serviceDetails.isValid;

  // shows nicely formatted errors in the terminal
  checkServiceIsValid(resolvedService.serviceDetails);

  staticReplacements.dmnoConfig = {};
  staticReplacements.dmnoPublicConfig = {};

  wranglerSystemEnv = {};
  dmnoWranglerSettings = {};
  injectedValues = {};
  injectedDynamicValues = {};

  for (const itemKey in injectedDmnoEnv) {
    if (itemKey.startsWith('$')) continue;

    const injectedItem = injectedDmnoEnv[itemKey];
    const val = injectedItem.value;

    // some config is to affect wrangler itself
    if (
      wranglerSystemEnvKeys.includes(itemKey)
      // users can pass in multiple bindings that will have different keys
      || itemKey.startsWith('WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_')
    ) {
      wranglerSystemEnv[itemKey] = val;
    } else if (dmnoWranglerEnvKeys.includes(itemKey)) {
      dmnoWranglerSettings[itemKey] = val;
    }

    // set up static build-time replacements
    if (!injectedItem.dynamic) {
      if (!injectedItem.sensitive) {
        staticReplacements.dmnoPublicConfig[`DMNO_PUBLIC_CONFIG.${itemKey}`] = JSON.stringify(injectedItem.value);
      }
      staticReplacements.dmnoConfig[`DMNO_CONFIG.${itemKey}`] = JSON.stringify(injectedItem.value);
    }

    injectedValues[itemKey] = val;
  }
}

let wranglerProcess: ChildProcess | undefined;

if (isDevMode) {
  dmnoServer.enableWatchMode(async () => {
    console.log('reload!!!');
    dmnoHasTriggeredReload = true;
    if (wranglerProcess) {
      // wranglerProcess.kill(15);
      wranglerProcess.kill(2);
    }
    await restartWrangler();
  });
}


let exitCode;
async function restartWrangler() {
  await reloadDmnoConfig();
  if (!dmnoConfigValid) {
    if (isDevMode) {
      console.log('watching for config changes...');
      return;
    } else {
      process.exit(1);
    }
  }


  const injectMode: 'inline' | 'secrets' = dmnoWranglerSettings.DWRANGLER_INJECT_MODE as any || 'inline';

  const wranglerBuildArgs = [];
  const wranglerDevArgs = [];

  // some commands trigger a build, and we need to inject config
  // this would be easier if wrangler had a .js config option and allowed plugins...
  if (['dev', 'deploy', 'versions upload'].includes(wranglerCommand)) {
    // all "static" config will be replaced at build time (using --define)

    // for "dynamic" config, we have 2 methods of injecting - vars or define

    // users can toggle between these modes by setting DWRANGLER_INJECT_MODE in their config.mts

    // in "define" mode, we inline the entire resolved config with additional metadata into the build code
    // this is necessary for our global patching stuff to work, and it also enables users to use config
    // outside of request handlers. Generally it's a lot simpler, but the idea of injecting at build time
    // and using globals may be offputting to some - although it is safe!
    if (injectMode === 'inline') {
      debug('injecting dynamic config using define');
      wranglerBuildArgs.push('--define', `__DMNO_INJECTED_CONFIG__:${JSON.stringify(injectedDmnoEnv)}`);


    // in "vars" mode, we do things the cloudflare way, and inject config as cloudflare "secrets"
    // during local dev, we use --var to inject, and to deploy we must do a multi-step versioned deploy
    // we also replace `DMNO_CONFIG.X` with `env.X` for convenience and type safety
    // this does require that users use the conventional `env` name for their handler
    // TODO: they will actually all be strings, so we need to figure out what to do about that
    // the upside is we are doing things the cloudflare way, the downsides are
    // - no security features (log redaction, leak detection)
    // - everythign is a string
    // - only able to use config within request handlers
    // - more complicated deployment workflow
    } else if (injectMode === 'secrets') {
      debug('injecting dynamic config as secrets');
      for (const key in injectedValues) {
        // we don't need to inject any static items, as they will be replaced
        if (injectedDmnoEnv[key].dynamic) {
          injectedDynamicValues[key] = injectedValues[key];
          // during local dev, we use --var to inject the dynamic env vars
          // but if we do that during deploy, it will treat them as "text" instead of "secret"
          if (wranglerCommand === 'dev') {
            wranglerBuildArgs.push('--var', `${key}:${injectedValues[key]}`);
          }
          wranglerBuildArgs.push('--define', `DMNO_CONFIG.${key}:env.${key}`);
        }
      }
    }
    // always inject static items using --define
    const allReplacements = { ...staticReplacements.dmnoConfig, ...staticReplacements.dmnoPublicConfig };
    console.log(allReplacements);
    for (const k in allReplacements) {
      wranglerBuildArgs.push('--define', `${k}:${allReplacements[k]}`);
    }
  }

  // apply some config items as args for wrangler dev
  // this is useful because we can manage it in our config, and we can reuse that data in our config
  if (isDevMode) {
    if (dmnoWranglerSettings.WRANGLER_DEV_PORT) {
      wranglerDevArgs.push('--port', dmnoWranglerSettings.WRANGLER_DEV_PORT);
    }
    if (dmnoWranglerSettings.WRANGLER_DEV_IP) {
      wranglerDevArgs.push('--ip', dmnoWranglerSettings.WRANGLER_DEV_IP);
    }
    if (dmnoWranglerSettings.WRANGLER_LIVE_RELOAD) {
      wranglerDevArgs.push('--live-reload');
    }
    if (dmnoWranglerSettings.WRANGLER_ENV) {
      wranglerDevArgs.push('--env', dmnoWranglerSettings.WRANGLER_ENV);
    }
  }

  // if we are deploying and using vars, we need to actually do a multi-step deployment:
  // - create new version
  // - set bulk secrets for that new version
  // - deploy the version
  if (wranglerCommand === 'deploy' && injectMode === 'secrets' && !args.includes('--dry-run')) {
    console.log('dwrangler will run a multi-step deployment for you');

    console.log('1 - CREATING NEW VERSION');


    const multiStepDeployEnv = {
      FORCE_COLOR: 'true',
      ...process.env,
      ...wranglerSystemEnv,
      // ...injectedProcessEnv // might want to inject all of injectedProcessEnv instead?
    };

    try {
      console.log('> STEP 1: BUILD AND CREATE NEW PENDING VERSION');
      const { stdout: versionsUploadOutput } = await execa(
        'wrangler',
        [
          'versions', 'upload',
          '--message', 'dmno dwrangler create deployment (secrets not yet set)',
          ...wranglerBuildArgs,
        ],
        {
          stdout: ['pipe', 'inherit'],
          env: multiStepDeployEnv,
        },
      );

      const versionId = versionsUploadOutput.match(/Worker Version ID: ([^\s]+)\n/)?.[1];
      // const previewUrl = versionsUploadOutput.match(/Version Preview URL: ([^\s]+)\n/)?.[1];
      if (!versionId) throw new Error('Did not create new version successfully');

      console.log('> STEP 2: ATTACH SECRETS TO PENDING VERSION');
      const { stdout: secretsOutput } = await execa(
        'wrangler',
        [
          'versions', 'secret', 'bulk',
          '--message', 'dmno dwrangler set bulk secrets',
        ],
        {
          stdout: ['pipe', 'inherit'],
          env: multiStepDeployEnv,
          input: JSON.stringify(injectedDynamicValues),
        },
      );

      const versionIdWithSecrets = secretsOutput.match(/Created version ([^\s]+)\s/)?.[1];
      if (!versionId) throw new Error('Did not deploy version with secrets successfully');

      console.log('> STEP 3: ACTIVATE NEW VERSION');
      const { stdout: deployOutput } = await execa(
        'wrangler',
        [
          'versions', 'deploy',
          `${versionIdWithSecrets}@100%`,
          '--yes',
        ],
        {
          stdout: ['pipe', 'inherit'],
          env: multiStepDeployEnv,
        },
      );
    } catch (err) {
      console.log(err);
    }
  } else {
    wranglerProcess = spawn(
      // TODO: how do we want to find the path to wrangler?
      wranglerBinPath,
      [...args, ...wranglerBuildArgs, ...wranglerDevArgs],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          ...wranglerSystemEnv,
        },
      },
    );


    // wranglerProcess?.stdout?.on('data', (data) => {
    //   console.log('stdoutt!', data);
    // });
    // wranglerProcess?.stderr?.on('data', (data) => {
    //   console.log('stderr!', data);
    // });
    // wranglerProcess?.stderr?.on('error', (data) => {
    //   console.log('error!', data);
    // });
    wranglerProcess.on('exit', (code, signal) => {
      console.log('wranglerProcess exit', { code, signal });
      // we are seeing wrangler exit code 0 and no signal both when
      // the user hits CTRL+C and when we restart the process
      // so we have to track whether we restarted it and ignore the close signal we get right after
      exitCode = code ?? 0;
      if (exitCode === 0) {
        if (dmnoHasTriggeredReload) {
          dmnoHasTriggeredReload = false;
        } else {
          process.exit(0);
        }
      } else {
        process.exit(exitCode);
      }
    });
  // wranglerProcess.on('close', () => {
  //   console.log('wrangler process - close');
  // });
  // wranglerProcess.on('disconnect', () => {
  //   console.log('wrangler process - disconnect');
  // });
  // wranglerProcess.on('error', () => {
  //   console.log('wrangler process - error');
  // });
  // wranglerProcess.on('message', () => {
  //   console.log('wrangler process - message');
  // });
  }
}

// if first run, we need to attach some extra exit handling

// try to make sure we shut down cleanly and kill the child process
process.on('exit', (code: any, signal: any) => {
  debug('dwrangler exit!');
  wranglerProcess?.kill(9);
});

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => {
    debug('dwrangler received signal', signal);
    wranglerProcess?.kill(9);
    process.exit(1);
  });
});
// TODO: handle other signals?

await restartWrangler();
