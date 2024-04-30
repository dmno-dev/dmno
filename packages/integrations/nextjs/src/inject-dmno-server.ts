/* eslint-disable no-console */
import { headers } from 'next/headers.js';

if (!process.env.DMNO_LOADED_ENV) {
  console.log('\n💥 Unable to find your dmno config 💥');
  console.log('You must run your dev/build command via `dmno run`\n');
  process.exit(1);
}

export const parsedDmnoLoadedEnv: Record<string, {
  sensitive?: boolean,
  useAt?: 'build' | 'boot',
  value: any,
}> = JSON.parse(process.env.DMNO_LOADED_ENV);

if (!(globalThis as any).DMNO_CONFIG) {
  // we inject a global proxy object so that we can customize the error messages
  // otherise we get an error that `DMNO_PUBLIC_CONFIG` doesn't exist
  (globalThis as any).DMNO_PUBLIC_CONFIG = new Proxy({}, {
    get(obj, key) {
      const keyStr = key.toString();

      if (!(keyStr in parsedDmnoLoadedEnv)) {
        console.log([
          `💥 You tried to access a non-existant config item on DMNO_PUBLIC_CONFIG "${keyStr}"`,
        ].join('\n'));
        throw new Error(`💥 Config item "${keyStr}" does not exist`);
      }

      if (parsedDmnoLoadedEnv[keyStr].sensitive) {
        console.log([
          '',
          `🛑 Config item "${keyStr}" is sensitive and must be accessed via DMNO_CONFIG instead of DMNO_PUBLIC_CONFIG`,
          'Be careful to access this only on the server and to not expose it',
        ].join('\n'));

        throw new Error(`🛑 Config item "${keyStr}" is sensitive and must be accessed via DMNO_CONFIG instead of DMNO_PUBLIC_CONFIG`);
      }

      // attempts to force the route into dynamic rendering mode so it wont put our our dynamic value into a pre-rendered page
      // however we have to wrap in try/catch because you can only call headers() within certain parts of the page... so it's not 100% foolproof
      if (parsedDmnoLoadedEnv[keyStr].useAt === 'boot') {
        // eslint-disable-next-line max-statements-per-line, no-empty
        try { headers(); } catch (err) {}
      }

      return parsedDmnoLoadedEnv[keyStr].value;
    },
  });

  (globalThis as any).DMNO_CONFIG = new Proxy({}, {
    get(obj, key) {
      const keyStr = key.toString();
      // console.log(`GET DMNO_CONFIG - ${keyStr}`);
      if (!(keyStr in parsedDmnoLoadedEnv)) {
        console.log([
          `💥 You tried to access a non-existant config item on DMNO_CONFIG "${keyStr}"`,
        ].join('\n'));
        throw new Error(`💥 Config item "${keyStr}" does not exist`);
      }

      // see notes above
      if (parsedDmnoLoadedEnv[keyStr].useAt === 'boot') {
        // eslint-disable-next-line max-statements-per-line, no-empty
        try { headers(); } catch (err) {}
      }


      return parsedDmnoLoadedEnv[keyStr].value;
    },
  });
} else {
  // console.log('DMNO_CONFIG already injected');
}
