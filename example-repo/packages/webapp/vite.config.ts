
// TODO: need to fix the linting rules so it knows to allow dev deps here
/* eslint-disable import/no-extraneous-dependencies */

import { PluginOption, defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import { ConfigServerClient } from '@dmno/core';

let firstLoad = false;

const injectDmnoConfigPlugin = () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  if (!(process as any).dmnoConfigClient) {
    firstLoad = true;
    // TODO: need to spin up dmno dev process here...

    (process as any).dmnoConfigClient = new ConfigServerClient();
  }
  const dmnoConfigClient: ConfigServerClient = (process as any).dmnoConfigClient;


  return {
    name: 'inject-dmno-config',
    async config(config, env) {
      const dmnoService = await dmnoConfigClient.getServiceConfig();

      let configIsValid = true;
      // TODO: not yet sure if this logic should live here or not...
      const publicConfigInjection = {} as Record<string, string>;
      for (const itemKey in dmnoService.config) {
        const configItem = dmnoService.config[itemKey];
        if (!configItem.isValid) {
          console.log(`Config item ${itemKey} is invalid`);

          configItem.validationErrors.forEach((error) => {
            console.log(`${error.icon} ${error.message}`);
          });

          configIsValid = false;
        } else {
          if (!configItem.dataType.sensitive) {
            publicConfigInjection[`DMNO_PUBLIC_CONFIG.${itemKey}`] = JSON.stringify(configItem.resolvedValue);
          }
        }
      }

      // inject rollup rewrites via config.define
      config.define = {
        ...config.define,
        ...publicConfigInjection,
      };

      // build mode - just need to load once
      if (env.command === 'build') {
        dmnoConfigClient.shutdown();

        if (!configIsValid) {
          throw new Error('Config validation failed');
        }

        // dev mode - load env, watch, and reload on changes
      } else if (env.command === 'serve') {
        // adjust vite's setting so it doesnt bury the error messages
        if (!configIsValid) config.clearScreen = false;
      }
    },
    async configureServer(server) {
      // not sure about this...
      if (firstLoad && server.config.command === 'serve') {
        dmnoConfigClient.eventBus.on('reload', () => {
          console.log('vite config received reload event');
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          server.restart();
        });
      }
    },
    // handleHotUpdate({ file, server }) {
    //   console.log('hot update', file);
    // },
  } as PluginOption;
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    injectDmnoConfigPlugin(),
  ],
});
