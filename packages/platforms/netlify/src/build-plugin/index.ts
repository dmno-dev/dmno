// build plugin

import { execSync } from 'node:child_process';
import fs, { FSWatcher } from 'node:fs';

//onPreBuild - runs before the build command is executed.
//onBuild - runs directly after the build command is executed and before Functions bundling.
//onPostBuild - runs after the build command completes; after onBuild tasks and Functions bundling are executed; and before the deploy stage. This is when file-based uploads for Netlify Blobs occur. Can be used to prevent a build from being deployed.
//onError - runs when an error occurs in the build or deploy stage, failing the build. Can’t be used to prevent a build from being deployed.
//onSuccess - runs when the deploy succeeds. Can’t be used to prevent a build from being deployed.
//onEnd - runs after completion of the deploy stage, regardless of build error or success; is useful for resources cleanup. Can’t be used to prevent a build from being deployed.

//onPreDev - runs before onDev.
//onDev - runs directly before the dev command.


const dmnoEnv = execSync('npm exec -- dmno resolve -f json-injected').toString();
// injectDmnoGlobals({
//   injectedConfig: JSON.parse(dmnoEnv),
// });


export function onBuild(args: any) {
  // const netlifyFolderPath = args.utils.cache.getCacheDir().replace(/\/[^/]+$/, '');
  const netlifyFolderPath = '/opt/build/repo/.netlify';
  console.log('on build!', dmnoEnv, netlifyFolderPath);
  updateDmnoInjectFile(netlifyFolderPath);
}

function updateDmnoInjectFile(netlifyFolderPath: string) {
  
  const injectorSrc = fs.readFileSync(`${import.meta.dirname}/injector.js`, 'utf8');

  const fullSrc = `
  // globalThis.process = globalThis.process || { env: {} };
  // globalThis.process.env.DMNO_INJECTED_ENV = ${dmnoEnv};
  ${injectorSrc.replace('injectDmnoGlobals();', '')}
  injectDmnoGlobals({ injectedConfig: ${dmnoEnv} });
  `;

  // const injectSrc = `
  // import { injectDmnoGlobals } from 'dmno';
  // const INJECTED_DMNO_ENV = JSON.parse(${JSON.stringify(dmnoEnv)});
  // injectDmnoGlobals({ injectConfig: INJECTED_DMNO_ENV });
  // `;

  // globalThis.DMNO_CONFIG = new Proxy({}, {
  //   get(_obj, key) {
  //     console.log('get dmno config', key.toString());
  //     return INJECTED_DMNO_ENV[key.toString()];
  //   }
  // });`;
  fs.writeFileSync(`${netlifyFolderPath}/inject-dmno-config.js`, fullSrc, 'utf8');
}


export function onPreBuild() {
  console.log('onPreBuild!');
}

function getNetlifyFolderPath(eventArgs: any) {
  return eventArgs.utils.cache.getCacheDir().replace(/\/[^/]+$/, '');
}

export function onPreDev(args: any) {
  const { netlifyConfig } = args;
  
  // console.log(netlifyConfig);
  // console.log(utils);
  console.log('PRE DEV!', {
    'netlifyConfig.build.environment': {
      CONTEXT_FOO: netlifyConfig.build.environment.CONTEXT_FOO,
      BUILD_FOO: netlifyConfig.build.environment.BUILD_FOO,
      UI_FOO: netlifyConfig.build.environment.UI_FOO,
    },
    'process.env': {
      CONTEXT_FOO: process.env.CONTEXT_FOO,
      BUILD_FOO: process.env.BUILD_FOO,
      UI_FOO: process.env.UI_FOO,
    }
  });


  const netlifyFolderPath = getNetlifyFolderPath(args);
  updateDmnoInjectFile(netlifyFolderPath);
}

export async function onDev(args: any) {

  // console.log('watching file', `${netlifyFolderPath}/edge-functions-serve/dev.js`);
  // watcher = fs.watch(`${netlifyFolderPath}`, { persistent: false, recursive: true }, () => {
  //   console.log('file change!');
  // })


  // const blobStore = await getDeployStore();
  // await blobStore.setJSON('INJECTED_DMNO_ENV', {
  //   CONTEXT_FOO: process.env.CONTEXT_FOO,
  //   BUILD_FOO: process.env.BUILD_FOO,
  //   UI_FOO: process.env.UI_FOO,
  // });

  // process.DMNO_TEST = 'foo';

  
}


// TRIGGER RESTART BY
// save netlify.toml? save each fn?


// export const onPreBuild = function({
//   constants,
//   inputs,
//   netlifyConfig,
//   packageJson,

// }) {

//   // process.env - includes all Netlify build environment variables and any variables you declare using the Netlify UI or TOML. We recommend you use this when you only need to get values during the build process.
//   // netlifyConfig.build.environment - includes only the variables you declare using the Netlify UI or TOML. We recommend you use this when you need to modify values during the build process.

//   console.log(netlifyConfig.build.environment)

//   console.log("Hello world from onPreBuild event!");
// }
