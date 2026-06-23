import fs from 'node:fs';
import path from 'node:path';
import * as _ from 'lodash-es';
import readYamlFile from 'read-yaml-file';
import { fdir } from 'fdir';
import { tryCatch } from '@dmno/ts-lib';
import Debug from 'debug';
import { checkbox } from '@inquirer/prompts';
import { pathExists } from '../lib/fs-utils';


const debug = Debug('dmno:find-services');

const jsonFileCache: Record<string, any> = {};
export async function readJsonFile(path: string) {
  if (jsonFileCache[path]) return jsonFileCache[path];
  const packageJsonObj = JSON.parse(await fs.promises.readFile(path, 'utf8'));
  jsonFileCache[path] = packageJsonObj;
  return packageJsonObj;
}


export type WorkspacePackagesListing = {
  name: string,
  version?: string,
  path: string,
  relativePath: string,
  isRoot: boolean,
  dmnoFolder: boolean,
};
export type WorkspaceSettings = {
  dev?: {
    host?: string;
    port?: number;
    ssl?: boolean;
  }
};

export type ScannedWorkspaceInfo = {
  gitRootPath?: string,
  isMonorepo: boolean,
  workspacePackages: Array<WorkspacePackagesListing>,
  autoSelectedPackage?: WorkspacePackagesListing,
  settings?: WorkspaceSettings,
  workspaceConfigs?: WorkspaceConfigSource[],
};

// list of locations to look for workspace project globs
// TODO: we could add extra conditions so we dont waste time looking for all the files?
const WORKSPACE_SETTINGS_LOCATIONS = [
  // explicit dmno workspace config - this overrides everything else
  { file: '.dmno/workspace.yaml', globsPath: 'projects' },
  // pnpm config file
  { file: 'pnpm-workspace.yaml', globsPath: 'packages' },
  // moonrepo config file
  { file: '.moon/workspace.yml', globsPath: 'projects' },
  // npm, yarn, bun, deno (supported)
  { file: 'package.json', globsPath: 'workspaces' },
  // deno also has a deno-specific config file to look in
  // { file: 'deno.json', path: 'workspace', optional: true },
  // { file: 'deno.jsonc', path: 'workspace', optional: true },
];

export type WorkspaceConfigSource = {
  filePath: string;
  settingsLocation: typeof WORKSPACE_SETTINGS_LOCATIONS[number];
  packagePatterns: string[];
  otherSettings?: WorkspaceSettings;
};

export async function findDmnoServices(includeUnitialized = false): Promise<ScannedWorkspaceInfo> {
  const startAt = new Date();

  let gitRootPath: string | undefined;
  let dmnoWorkspaceRootPath: string | undefined;
  let dmnoWorkspaceFinal = false;
  let isMonorepo = false;
  let packagePatterns: Array<string> | undefined;
  let workspaceConfigs: WorkspaceConfigSource[] = [];

  let otherSettings: WorkspaceSettings | undefined;

  // we'll scan upwards from cwd until the git root (or we hit `/`)
  let cwd = process.cwd();
  const cwdParts = cwd.split('/');
  while (cwd) {
    debug('scanning CWD = ', cwdParts, cwd);
    // look for workspace package globs in a few locations (see above)
    // and we'll keep scanning upwards, unless we found a `.dmno/workspace.yaml`
    if (!dmnoWorkspaceFinal) {
      for (const settingsLocation of WORKSPACE_SETTINGS_LOCATIONS) {
        const filePath = path.join(cwd, settingsLocation.file);
        if (!await pathExists(filePath)) continue;

        debug(`found workspace settings file: ${filePath}`);

        // assume first package.json file found is root until we find evidence otherwise
        if (settingsLocation.file === 'package.json' && !dmnoWorkspaceRootPath) {
          dmnoWorkspaceRootPath = cwd;
          debug(`set dmnoWorkspaceRootPath to ${cwd} (from package.json)`);
        }

        debug(`looking for workspace globs in ${filePath} > ${settingsLocation.globsPath}`);
        const fileType = path.extname(filePath);
        let fileContents: any;
        if (fileType === '.yaml' || fileType === '.yml') {
          fileContents = await readYamlFile(filePath);
        } else if (fileType === '.json') {
          fileContents = await readJsonFile(filePath);
        }
        const possiblePackagePatterns = _.get(fileContents, settingsLocation.globsPath);
        if (possiblePackagePatterns) {
          // Handle both legacy format (workspaces as array) and modern format (workspaces as object with packages property)
          let actualPackagePatterns: string[] | undefined;
          if (Array.isArray(possiblePackagePatterns)) {
            actualPackagePatterns = possiblePackagePatterns;
          } else if (possiblePackagePatterns && typeof possiblePackagePatterns === 'object' && possiblePackagePatterns.packages) {
            actualPackagePatterns = possiblePackagePatterns.packages;
          }
          
          if (actualPackagePatterns) {
            debug(`found workspace patterns in ${filePath}:`, actualPackagePatterns);
            
            // Store this workspace configuration
            workspaceConfigs.push({
              filePath,
              settingsLocation,
              packagePatterns: actualPackagePatterns,
              otherSettings: settingsLocation.file === '.dmno/workspace.yaml' ? _.omit(fileContents, settingsLocation.globsPath) : undefined
            });
            
            // Set workspace root if not already set
            if (!dmnoWorkspaceRootPath) {
              dmnoWorkspaceRootPath = cwd;
              debug(`updated dmnoWorkspaceRootPath to ${cwd} (from workspace patterns)`);
            }
            isMonorepo = true;
          }
        }

        // if this is our dmno-specific file, we'll consider this "final" and stop scanning upwards
        if (settingsLocation.file === '.dmno/workspace.yaml') {
          debug(`found dmno workspace config at ${filePath} - stopping upward scan`);
          dmnoWorkspaceFinal = true;
          break; // breaks from for loop - will still continue looking for git root
        }
      }
    }

    // check for .git folder to detect git root
    if (await pathExists(path.join(cwd, '.git'))) {
      gitRootPath = cwd;
      // if we hadn't found a dmno workspace root yet, we'll fall back to the git root
      if (!dmnoWorkspaceRootPath) dmnoWorkspaceRootPath = gitRootPath;
      // we stop scanning when we find the git root!
      break;
    }

    // go up one level and continue
    cwdParts.pop();
    cwd = cwdParts.join('/');
  }

  if (!dmnoWorkspaceRootPath) {
    // TODO: add link to docs with more info
    throw new Error('Unable to detect dmno workspace root');
  }

  // Process workspace configurations
  if (workspaceConfigs.length > 0) {
    // If there's only one config or they're all equivalent, select immediately
    if (workspaceConfigs.length === 1 || areWorkspaceConfigsEquivalent(workspaceConfigs)) {
      const selectedConfig = await selectWorkspaceConfig(workspaceConfigs);
      packagePatterns = selectedConfig.packagePatterns;
      if (selectedConfig.otherSettings) {
        otherSettings = selectedConfig.otherSettings;
      }
    } else {
      // Return the configs to be selected by the calling code
      // Use the first config temporarily for the scanning phase
      packagePatterns = workspaceConfigs[0].packagePatterns;
      if (workspaceConfigs[0].otherSettings) {
        otherSettings = workspaceConfigs[0].otherSettings;
      }
    }
  }

  // const { packageManager, rootWorkspacePath: rootServicePath } = await detectPackageManager();

  let packagePaths = [dmnoWorkspaceRootPath];
  if (isMonorepo && packagePatterns?.length) {
    const fullPackagePatterns = packagePatterns.map((gi) => path.join(dmnoWorkspaceRootPath, gi));
    const patternsByType = _.groupBy(
      fullPackagePatterns,
      (s) => (s.includes('*') ? 'globs' : 'dirs'),
    );

    const expandedPathsFromGlobs = await (
      // tried a few different libs here (tiny-glob being the other main contender) and this is WAY faster especially with some tuning :)
      new fdir() // eslint-disable-line new-cap
        .withBasePath()
        .onlyDirs()
        .glob(...patternsByType.globs || [])
        .exclude((dirName, _dirPath) => {
          // this helps speed things up since it stops recursing into these directories
          return (
            dirName === 'node_modules'
            // could add more... doesn't seem to make a big difference
            // || dirName === '.dmno'
            // || dirName === 'src'
            // || dirName === 'dist'
            // || dirName === '.next'
          );
        })
        .crawl(dmnoWorkspaceRootPath)
        .withPromise()
    );
    packagePaths.push(...patternsByType.dirs || []);
    packagePaths.push(...expandedPathsFromGlobs);
    packagePaths = packagePaths.map((p) => p.replace(/\/$/, '')); // remove trailing slash
    packagePaths = _.uniq(packagePaths);
  }

  const workspacePackages = _.compact(await Promise.all(packagePaths.map(async (packagePath) => {
    const packageJson = await tryCatch(
      async () => await readJsonFile(path.join(packagePath, 'package.json')),
      (err) => {
        if ((err as any).code === 'ENOENT') return undefined;
        throw err;
      },
    );

    const dmnoFolderExists = await pathExists(path.join(packagePath, '.dmno'));

    // TODO: are there other places we can look for package name?
    const packageName = packageJson?.name || packagePath.split('/').pop();

    return {
      isRoot: packagePath === dmnoWorkspaceRootPath,
      path: packagePath,
      relativePath: packagePath.substring(dmnoWorkspaceRootPath.length + 1),
      name: packageName,
      dmnoFolder: dmnoFolderExists,
    };
  })));

  const packageFromPwd = workspacePackages.find((p) => p.path === process.env.PWD);
  // note - this doesn't play nice if you have duplicate package names in your monorepo...
  // this shouldnt really be an issue, but it's notable
  const packageManagerCurrentPackageName = process.env.npm_package_name || process.env.PNPM_PACKAGE_NAME;
  const packageFromCurrentPackageName = workspacePackages.find((p) => p.name === packageManagerCurrentPackageName);

  debug(`completed scanning in ${+new Date() - +startAt}ms`);

  return {
    gitRootPath,
    isMonorepo,
    workspacePackages: includeUnitialized ? workspacePackages : _.filter(workspacePackages, (p) => p.dmnoFolder),
    autoSelectedPackage: packageFromPwd || packageFromCurrentPackageName,
    settings: otherSettings,
    workspaceConfigs: workspaceConfigs.length > 1 && !areWorkspaceConfigsEquivalent(workspaceConfigs) ? workspaceConfigs : undefined,
  };
}

function standardizePackagePatterns(patterns: string[]): string[] {
  return _.uniq(patterns.map(p => p.trim()).filter(Boolean)).sort();
}

function areWorkspaceConfigsEquivalent(configs: WorkspaceConfigSource[]): boolean {
  if (configs.length <= 1) return true;
  
  const standardizedPatterns = configs.map(config => 
    standardizePackagePatterns(config.packagePatterns)
  );
  
  const firstPatterns = standardizedPatterns[0];
  return standardizedPatterns.every(patterns => 
    _.isEqual(patterns, firstPatterns)
  );
}

async function selectWorkspaceConfig(configs: WorkspaceConfigSource[]): Promise<{ packagePatterns: string[], otherSettings?: WorkspaceSettings }> {
  if (configs.length === 0) {
    throw new Error('No workspace configurations found');
  }
  
  if (configs.length === 1) {
    return {
      packagePatterns: configs[0].packagePatterns,
      otherSettings: configs[0].otherSettings
    };
  }
  
  // Check if all configurations are equivalent
  if (areWorkspaceConfigsEquivalent(configs)) {
    debug(`Found ${configs.length} workspace configurations, but they are equivalent - proceeding with first one`);
    return {
      packagePatterns: configs[0].packagePatterns,
      otherSettings: configs[0].otherSettings
    };
  }
  
  // Check if we're in a non-interactive environment
  const isNonInteractive = process.env.CI || process.env.TERM === 'dumb' || !process.stdin.isTTY;
  
  if (isNonInteractive) {
    debug(`Found ${configs.length} different workspace configurations, using first one in non-interactive mode`);
    debug(`Selected: ${configs[0].filePath} - ${configs[0].packagePatterns.join(', ')}`);
    return {
      packagePatterns: configs[0].packagePatterns,
      otherSettings: configs[0].otherSettings
    };
  }
  
  // Show user selection for different configurations
  const selectedConfigIndices = await checkbox({
    message: `Found ${configs.length} different workspace configurations.\nSelect which to use (Press <space> to select, <a> to toggle all, <enter> to proceed):\n`,
    choices: configs.map((config, index) => ({
      name: `${config.filePath} - [${config.packagePatterns.join(', ')}]`,
      value: index,
      checked: index === 0 // Default to first one
    })),
    instructions: false
  });
  
  if (selectedConfigIndices.length === 0) {
    throw new Error('No workspace configuration selected');
  }
  
  // Combine selected configurations and deduplicate
  const selectedConfigs = selectedConfigIndices.map(index => configs[index]);
  const allPatterns = _.flatten(selectedConfigs.map(config => config.packagePatterns));
  const deduplicatedPatterns = standardizePackagePatterns(allPatterns);
  
  // Merge other settings from selected configs
  const mergedOtherSettings = selectedConfigs.reduce((acc, config) => {
    if (config.otherSettings) {
      return _.merge(acc, config.otherSettings);
    }
    return acc;
  }, {} as WorkspaceSettings);
  
  debug(`Selected ${selectedConfigs.length} workspace configurations, deduplicated to ${deduplicatedPatterns.length} patterns`);
  
  return {
    packagePatterns: deduplicatedPatterns,
    otherSettings: Object.keys(mergedOtherSettings).length > 0 ? mergedOtherSettings : undefined
  };
}

export async function selectAndApplyWorkspaceConfig(workspaceInfo: ScannedWorkspaceInfo): Promise<ScannedWorkspaceInfo> {
  if (!workspaceInfo.workspaceConfigs || workspaceInfo.workspaceConfigs.length <= 1) {
    return workspaceInfo;
  }

  const selectedConfig = await selectWorkspaceConfig(workspaceInfo.workspaceConfigs);
  
  // Get the workspace root path from the original info
  const dmnoWorkspaceRootPath = workspaceInfo.workspacePackages.find(p => p.isRoot)?.path;
  if (!dmnoWorkspaceRootPath) {
    throw new Error('Unable to find workspace root path');
  }
  
  // Rebuild package paths with selected patterns
  let packagePaths = [dmnoWorkspaceRootPath];
  if (workspaceInfo.isMonorepo && selectedConfig.packagePatterns?.length) {
    const fullPackagePatterns = selectedConfig.packagePatterns.map((gi) => path.join(dmnoWorkspaceRootPath, gi));
    const patternsByType = _.groupBy(
      fullPackagePatterns,
      (s) => (s.includes('*') ? 'globs' : 'dirs'),
    );

    const expandedPathsFromGlobs = await (
      new fdir()
        .withBasePath()
        .onlyDirs()
        .glob(...patternsByType.globs || [])
        .exclude((dirName, _dirPath) => {
          return dirName === 'node_modules';
        })
        .crawl(dmnoWorkspaceRootPath)
        .withPromise()
    );
    packagePaths.push(...patternsByType.dirs || []);
    packagePaths.push(...expandedPathsFromGlobs);
    packagePaths = packagePaths.map((p) => p.replace(/\/$/, ''));
    packagePaths = _.uniq(packagePaths);
  }

  // Rebuild workspace packages
  const workspacePackages = _.compact(await Promise.all(packagePaths.map(async (packagePath) => {
    const packageJson = await tryCatch(
      async () => await readJsonFile(path.join(packagePath, 'package.json')),
      (err) => {
        if ((err as any).code === 'ENOENT') return undefined;
        throw err;
      },
    );

    const dmnoFolderExists = await pathExists(path.join(packagePath, '.dmno'));
    const packageName = packageJson?.name || packagePath.split('/').pop();

    return {
      isRoot: packagePath === dmnoWorkspaceRootPath,
      path: packagePath,
      relativePath: packagePath.substring(dmnoWorkspaceRootPath.length + 1),
      name: packageName,
      dmnoFolder: dmnoFolderExists,
    };
  })));

  return {
    ...workspaceInfo,
    workspacePackages,
    settings: selectedConfig.otherSettings || workspaceInfo.settings,
    workspaceConfigs: undefined // Clear this since we've made the selection
  };
}
