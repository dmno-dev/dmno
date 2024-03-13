import { execSync } from 'child_process';
import _ from 'lodash-es';

export function getResolvedConfig() {
  try {
    const configResult = execSync('pnpm exec dmno load -f json');
    const configObj = JSON.parse(configResult.toString());
    return configObj;
  } catch (err) {
    // console.log('caught error while trying to load dmno config');
    console.log((err as any).stdout.toString());
    throw err;
  }
}

export function getResolvedConfigForEnvInjection() {
  const config = getResolvedConfig();
  // when injecting into vite config via the `define` option, we need the data in a certain format
  // - each key must be like `import.meta.env.KEY`
  // - values must be JSON.stringified - meaning a string include quotes, for example '"value"'
  return _.transform(config, (acc, item, key) => {
    acc[`import.meta.env.${key.toString()}`] = JSON.stringify(item.resolvedValue);

    acc[`DMNO_CONFIG.${key.toString()}`] = JSON.stringify(item.resolvedValue);
  }, {} as any);
}
