import { globSync } from 'glob';
import Router from '@koa/router';

import { getThisDirname } from '../lib/this-file-path';
import { CustomAppContext, CustomAppState } from '../custom-state';
import { createDeferredPromise } from '../lib/defer-promise';

const __dirname = getThisDirname(import.meta.url);

// we initialize and export the router immediately
// but we'll add routes to it here and in each routes file
export const router = new Router<CustomAppState, CustomAppContext>();
export type CustomRouter = Router<CustomAppState, CustomAppContext>;

router.get('/', async (ctx) => {
  // TODO: add something which checks redis and postgres connections are working
  ctx.body = {
    systemStatus: 'nope',
    envCheck: DMNO_CONFIG.API_ONLY || 'env-var-not-loaded',
    dmnoTest: DMNO_CONFIG.PORT,
    public: DMNO_PUBLIC_CONFIG.PUBLIC_EXAMPLE,
  };
});

// special route used to check 500 error handling is working correctly
if (process.env.NODE_ENV === 'test') {
  router.get('/boom', async (ctx) => {
    // we'll look for this message in our tests to make sure it is not exposed
    throw new Error('unexpected error - crash boom bang');
  });
}

const routesLoadedDefer = createDeferredPromise();
export const routesLoaded = routesLoadedDefer.promise;

// automatically load all *.routes.ts files in this directory
// (need .js for when the files are built)
const routeFilePaths = globSync(`${__dirname}/**/*.routes.{js,ts}`);
// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async function loadRoutes() {
  for (const routeFilePath of routeFilePaths) {
    // NOTE this is async, but in practice it's fine
    // if we see problems, we can switch over to importing manually...
    await import(routeFilePath.replace(__dirname, './'));
  }
  routesLoadedDefer.resolve();
}());

class TestObj {
  prop1 = DMNO_CONFIG.SECRET_FOO;
}
router.get('/redact-demo', async (ctx) => {
  const obj = new TestObj();

  console.log('secret foo = ', { o: [1, 2, DMNO_CONFIG.SECRET_FOO] });
  // console.log('unmasked secret foo = ', unredact(DMNO_CONFIG.SECRET_FOO));
  console.log('another secret = ', DMNO_CONFIG.ANOTHER_SECRET);
  console.log(`secret value = ${DMNO_CONFIG.SECRET_FOO}`);

  console.log({ method: 'console.log', 'secret value': DMNO_CONFIG.SECRET_FOO });
  console.dir({ method: 'console.dir', 'secret value': DMNO_CONFIG.SECRET_FOO });
  console.warn({ method: 'console.warn', 'secret value': DMNO_CONFIG.SECRET_FOO });
  console.error({ method: 'console.error', 'secret value': DMNO_CONFIG.SECRET_FOO });

  console.dir({ 'secret value': DMNO_CONFIG.SECRET_FOO });
  console.log(['secret value', DMNO_CONFIG.SECRET_FOO, `secret = ${DMNO_CONFIG.SECRET_FOO}`]);
  console.log(obj);
  console.log({ obj });

  ctx.body = { message: 'check logs to see redacted secrets' };
});

router.get('/interceptor-demo', async (ctx) => {
  console.log('Hmm better send some debugging data to our logging service 📡');

  const apiResp = await fetch('https://api.sampleapis.com/beers/ale', {
    headers: {
      secret: DMNO_CONFIG.STRIPE_SECRET_KEY,
      'x-another': 'bloop',
    },
  });
  const results = await apiResp.json();

  ctx.body = results;
});

router.get('/leak-demo', async (ctx) => {
  ctx.body = {
    leaked: DMNO_CONFIG.SECRET_FOO,
  };
});
