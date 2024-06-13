/* eslint-disable import/first */
/* eslint-disable no-console */

import { injectDmnoGlobals, patchGlobalConsoleToRedactSensitiveLogs, enableHttpInterceptor } from 'dmno/injector';

injectDmnoGlobals();
patchGlobalConsoleToRedactSensitiveLogs();
enableHttpInterceptor();

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import chalk from 'chalk';
import cors from '@koa/cors';

import { router, routesLoaded } from './routes';
import { ApiError, errorHandlingMiddleware } from './lib/api-error';
import { httpRequestLoggingMiddleware } from './lib/request-logger';
// import { loadAuthMiddleware } from "./services/auth.service";
import { detectClientIp } from './lib/client-ip';
import { CustomAppContext, CustomAppState } from './custom-state';


// console.log('\n\n');
// console.log('Just a normal day, console.log-ging some secrets by accident 👀');
// console.log(`Here's one now! SECRET_FOO = ${DMNO_CONFIG.SECRET_FOO}`);

// console.log('\n\n');
// console.log('Hmm better send some debugging data to our logging service 📡');

// const apiResp = await fetch(
//   'https://api.myloggingtool.com/ingest',
//   // `http://localhost:4321/api.json?q1=asdf&q2=moo&q3=${DMNO_CONFIG.STRIPE_KEY}`,
//   {
//     method: 'POST',
//     // body: formData,
//     body: JSON.stringify({
//       name: 'John Doe',
//       age: 29,
//       secret: DMNO_CONFIG.STRIPE_SECRET_KEY,
//       another: DMNO_CONFIG.SECRET_FOO,
//     }),
//     headers: {
//       'Content-Type': 'application/json',
//       // 'x-custom-auth': DMNO_CONFIG.STRIPE_KEY,
//       'x-another': 'bloop',
//     },
//   },
// );

// console.log(apiResp);


class TestObj {
  prop1 = DMNO_CONFIG.SECRET_FOO;
}
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

export const app = new Koa<CustomAppState, CustomAppContext>();

app.proxy = true;

// include this one early since it can fire off and be done when handling OPTIONS requests
app.use(cors({ credentials: true }));
app.use(detectClientIp);
app.use(httpRequestLoggingMiddleware);
app.use(errorHandlingMiddleware);
app.use(bodyParser());
// app.use(loadAuthMiddleware);

// routes - must be last after all middlewares
app.use(router.routes());

// catch-all middelware after routes handles no route match (404)
app.use((_ctx, _next) => {
  throw new ApiError('NotFound', 'NoMatchingURL', 'No matching URL found');
});

if (process.env.NODE_ENV !== 'test') {
  // not strictly necessary, but this way we fail right away if we can't connect to db
  try {
    // await prisma.$connect();
    await routesLoaded;
    app.listen(DMNO_CONFIG.PORT);
    console.log(chalk.green.bold(`API available at ${DMNO_CONFIG.API_URL}`));
    // await prisma.$disconnect();
  } catch (err) {
    console.log('ERROR!', err);
    // await prisma.$disconnect();
  }
}

// process.on('SIGINT', () => {
//   console.log('SIGINT!');
//   process.exit(1);
// });
