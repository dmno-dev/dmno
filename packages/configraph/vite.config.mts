/* eslint-disable import/no-extraneous-dependencies */

/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      // extra hint to look in this directory only, otherwise goes all the way up through monorepo
      root: __dirname,
    }),
  ],
  test: {
    // coverage: {
    //   exclude: ['src/api'],
    //   include: ['src'],
    // },
    // environment: 'jsdom',
    // globals: true,
    // setupFiles: './setupTests.ts',

    onConsoleLog(log: string, type: 'stdout' | 'stderr'): false | void {
      console.log('log in test: ', log);
      if (log === 'message from third party library' && type === 'stdout') {
        return false;
      }
    },
  },
});
