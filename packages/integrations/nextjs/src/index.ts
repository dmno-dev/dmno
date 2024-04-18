import { NextConfig } from 'next';

const processAny = process as any;

if (process.env.DMNO_LOADED_ENV && !processAny.dmnoEnv) {
  const parsedDmnoEnv = JSON.parse(process.env.DMNO_LOADED_ENV);
  process.env.DMNO_EMPTY_PATHS?.split('!').forEach((emptyPath) => {
    parsedDmnoEnv[emptyPath] = undefined;
  });

  processAny.dmnoEnv = new Proxy(parsedDmnoEnv, {
    get(dmnoEnv, key) {
      // TODO: deal with nested object stuff
      if (key in dmnoEnv) return dmnoEnv[key];
      throw new Error(`💥 DMNO config item "${key.toString()}" does not exist!`);
    },
  });

  // we inject a global proxy object so that we can customize the error messages
  // otherise we get an error that `DMNO_PUBLIC_CONFIG` doesn't exist
  (globalThis as any).DMNO_PUBLIC_CONFIG = new Proxy({}, {
    get(obj, key) {
      const keyStr = key.toString();
      if (processAny.dmnoEnv[key]) {
        console.log([
          '',
          `🛑 Config item "${keyStr}" is sensitive and must be accessed via process.dmnoEnv instead of DMNO_PUBLIC_CONFIG`,
          'Be careful to access this only on the server and to not expose it',
        ].join('\n'));

        throw new Error(`🛑 Config item "${keyStr}" is sensitive and must be accessed via process.dmnoEnv instead of DMNO_PUBLIC_CONFIG`);
      } else {
        console.log([
          `💥 You tried to access a non-existant config item "${keyStr}"`,
        ].join('\n'));
        throw new Error(`💥 Config item "${keyStr}" does not exist`);
      }
    },
  });
}


// we make this a function becuase we'll likely end up adding some options
export function dmnoNextConfigPlugin() {
  // nextjs doesnt have a proper plugin system, so we write a function which takes in a config object and returns an augmented one
  return (nextConfig: NextConfig): NextConfig => {
    return {
      ...nextConfig,
      webpack: (webpackConfig, options) => {
        // webpack itself  is passed in so we dont have to import it...
        const webpack = options.webpack;

        // apply existing user customizations if there are any
        if (nextConfig.webpack) {
          webpackConfig = nextConfig.webpack(webpackConfig, options);
        }


        // modify entry points to inject a our dmno env shim
        // (currently it is only used to help with error handling / messages)
        const originalEntry = webpackConfig.entry;
        webpackConfig.entry = async () => {
          const entries = await originalEntry();
          // console.log(entries);

          const injectDmnoEnvFilePath = `${import.meta.dirname}/inject-dmno-env.mjs`;

          if (entries['main-app']) {
            if (
              !entries['main-app'].includes(injectDmnoEnvFilePath)
            ) {
              entries['main-app'].unshift(injectDmnoEnvFilePath);
            }
          }

          return entries;
        };

        const publicEnvDefs: Record<string, string> = {};
        if (processAny.dmnoEnv) {
          const sensitivePaths = process.env.DMNO_SENSITIVE_PATHS?.split('!') || [];

          for (const key in processAny.dmnoEnv) {
            // TODO: deal with nested objects
            if (!sensitivePaths.includes(key)) {
              publicEnvDefs[`DMNO_PUBLIC_CONFIG.${key}`] = JSON.stringify(processAny.dmnoEnv[key]);
              // publicEnvDefs[`process.dmnoEnv.${key}`] = JSON.stringify(process.dmnoEnv[key]);
            }
          }

          // publicEnvDefs['process.dmnoEnv'] = 'globalThis.PROCESS_DMNO_ENV';
          // console.log(publicEnvDefs);
          webpackConfig.plugins.push(new webpack.DefinePlugin(publicEnvDefs));
        } else {
          console.log('\n\n💥 Unable to find your dmno config 💥');
          console.log('You must run your dev/build command via `dmno run`');
          process.exit(1);
        }

        // Important: return the modified config
        return webpackConfig;
      },
    };
  };
}
