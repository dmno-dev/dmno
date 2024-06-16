// Netlify build plugin that injects DMNO_CONFIG into functions and edge functions
// see https://docs.netlify.com/integrations/build-plugins/create-plugins/

/*
note that there are many subtle challenges here... small changes may break things
  
Notes to self
- edge functions are running in a different runtime (Deno) and we cannot inject any env vars directly
- we do not have access to the file system in Deno
- workflow for authoring functions directly may be very different than using an integration like Astro's netlify adapter, which completely builds the functions itself
*/

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Debug from 'debug';

const debug = Debug('dmno:netlify-build-plugin');

const __dirname = dirname(fileURLToPath(import.meta.url));

const dmnoEnv = execSync('npm exec -- dmno resolve -f json-injected').toString();

function getNetlifyFolderPath(eventArgs: any) {
  if (eventArgs.constants.IS_LOCAL) {
    return eventArgs.utils.cache.getCacheDir().replace(/\/[^/]+$/, '');
  } return '/opt/build/repo/.netlify';
}

// this is the source of `dmno/inject-globals` but bundled into a single file
const standaloneInjectorPath = fileURLToPath(import.meta.resolve('dmno/injector-standalone'));
const standaloneInjectorSrc = await fs.promises.readFile(standaloneInjectorPath, 'utf8');

function updateDmnoInjectFile(netlifyFolderPath: string) {
  const injectorSrcWithEnv = standaloneInjectorSrc + `\n\ninjectDmnoGlobals({ injectedConfig: ${dmnoEnv} });`;
  fs.writeFileSync(`${netlifyFolderPath}/inject-dmno-config.js`, injectorSrcWithEnv, 'utf8');
}

const IMPORT_INJECTOR_REGEX = /^import ["'](\.\.\/)+\.netlify\/inject-dmno-config\.js["']/m;

export async function onPreBuild(args: any) {
  const netlifyFolderPath = getNetlifyFolderPath(args);
  updateDmnoInjectFile(netlifyFolderPath);
}
export async function onBuild(args: any) {
  const netlifyFolderPath = getNetlifyFolderPath(args);

  const injectorImportPath = `${netlifyFolderPath}/inject-dmno-config.js`;

  // handle regular "functions" (lambdas)
  try {
    const allFunctions = await args.utils.functions.list();
    for (const fn of allFunctions) {
      

      const originalSrc = await fs.promises.readFile(fn.mainFile, 'utf8');
      
      if (originalSrc.match(IMPORT_INJECTOR_REGEX)) {
        debug('function @ '+fn.mainFile+' already imports dmno config injector');
        continue;
      }
      // TODO: we could show a better error here if the user is directly authoring their functions and has not imported the config injector
      // the built functions are already in the .netlify folder when being built by in integration
      // versus in the `netlify/functions` folder when direct authoring
      // const isDirectAuthoring = fn.mainFile.includes('/netlify/functions/')

      // NOTE - if we inject the config directly, other imports get hoisted above it
      // so we have to inject an import that includes the config instead
      const relativeImportPath = path.relative(dirname(fn.mainFile), injectorImportPath);

      const updatedSrc = `import '${relativeImportPath}';\n` + originalSrc;
      await fs.promises.writeFile(fn.mainFile, updatedSrc, 'utf8');
      debug('updated function @ '+fn.mainFile, originalSrc.substr(0,100));
    }
  } catch (err) {
    console.log('skipping functions');
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
      if (originalSrc.match(IMPORT_INJECTOR_REGEX)) {
        debug('edge function @ '+fullFilePath+' already imports dmno config injector');
        continue;
      }

      // see same note above about import vs directly injecting
      const updatedSrc = `import '../../inject-dmno-config.js';\n` + originalSrc;
      await fs.promises.writeFile(fullFilePath, updatedSrc, 'utf8');
      debug('updated EDGE function @ '+fullFilePath, originalSrc.substr(0,100));    
    }
  }
}



export function onPreDev(args: any) {
  const netlifyFolderPath = getNetlifyFolderPath(args);
  updateDmnoInjectFile(netlifyFolderPath);
}

