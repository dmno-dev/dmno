import 'dmno/injector-standalone/edge-auto';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { HTTPException } from 'hono/http-exception';
import { signupRoutes } from './routes/signup.routes';
import { HonoEnv } from './hono-env';
import { initErrorHandler } from './lib/error-utils';

const app = new Hono<HonoEnv>().basePath('');
initErrorHandler(app);

app.use(cors());

app.get('/', async (c) => {
  return c.json({ apiStatus: 'ok' });
});

app.route('/', signupRoutes);

// catch-all 404
app.use(async (c) => {
  throw new HTTPException(404, { message: 'Not found' });
});

export default {
  fetch: app.fetch,
};
