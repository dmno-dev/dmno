// build plugin

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// const INJECT_DMNO_ENV_SRC = `globalThis._DMNO_INJECTED_ENV = ${dmnoEnv};`
// const INJECT_DMNO_ENV_SRC = `import { injectDmnoGlobals } from 'dmno/injector'; injectDmnoGlobals({ injectedConfig: ${dmnoEnv} });`;


const __dirname = dirname(fileURLToPath(import.meta.url));

const INJECTOR_FULL_SRC = fs.readFileSync(`${__dirname}/injector.js`, 'utf8');
console.log(INJECTOR_FULL_SRC);

export async function onBuild(args: any) {
  console.log('onBuild hook!');
  const netlifyFolderPath = args.constants.IS_LOCAL ? args.utils.cache.getCacheDir().replace(/\/[^/]+$/, '') : '/opt/build/repo/.netlify';
  
  updateDmnoInjectFile(netlifyFolderPath);

  // handle regular "functions" (lambdas)
  const allFunctions = await args.utils.functions.list();
  console.log(allFunctions);
  for (const fn of allFunctions) {
    const originalSrc = await fs.promises.readFile(fn.mainFile, 'utf8');

    // NOTE - if we inject the config directly, other imports get hoisted above it
    // so we have to inject an import that includes the config instead
    // TODO: resolve correct path
    const updatedSrc = `import '../../inject-dmno-config.js';\n` + originalSrc;
    await fs.promises.writeFile(fn.mainFile, updatedSrc, 'utf8');
    console.log('updated function @ '+fn.mainFile, originalSrc.substr(0,100));
  }

  // handle "edge functions"
  const edgeFnsDir = `${netlifyFolderPath}/edge-functions`;
  if (fs.existsSync(edgeFnsDir)) {
    const edgeFnFileNames = await fs.promises.readdir(edgeFnsDir, { recursive: true });
    for (const edgeFnFileName of edgeFnFileNames) {
      if (edgeFnFileName.startsWith('.vendor')) continue;
      if (!(edgeFnFileName.endsWith('.mjs') || edgeFnFileName.endsWith('.cjs') || edgeFnFileName.endsWith('.js'))) continue;
      const fullFilePath = `${edgeFnsDir}/${edgeFnFileName}`;
      const originalSrc = await fs.promises.readFile(fullFilePath, 'utf8');
      // TODO: resolve correct path
      // see same note above about import vs directly injecting
      const updatedSrc = `import '../../inject-dmno-config.js';\n` + originalSrc;
      await fs.promises.writeFile(fullFilePath, updatedSrc, 'utf8');
      console.log('updated EDGE function @ '+fullFilePath, originalSrc.substr(0,100));    
    }
  }
}

function updateDmnoInjectFile(netlifyFolderPath: string) {
  // fs.writeFileSync(`${netlifyFolderPath}/inject-dmno-config.js`, INJECT_DMNO_ENV_SRC, 'utf8');
  const injectorSrcWithEnv = INJECTOR_FULL_SRC.replace('injectDmnoGlobals();', `injectDmnoGlobals({ injectedConfig: ${dmnoEnv} });`)
  fs.writeFileSync(`${netlifyFolderPath}/inject-dmno-config.js`, injectorSrcWithEnv, 'utf8');
}


export function onPreBuild() {
  console.log('onPreBuild hook!');
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
