/* eslint-disable import/no-extraneous-dependencies */

/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';

export default defineConfig({
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
