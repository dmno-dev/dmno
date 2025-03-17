import { z } from 'zod';
import { Hono } from 'hono';
import EmailValidation from 'emailvalid';

import { HTTPException } from 'hono/http-exception';
import { HonoEnv } from '../hono-env';
import mailerlite from '../lib/mailerlite';
import { zValidator } from '../lib/error-utils';

const ev = new EmailValidation({ allowFreemail: true });


export const signupRoutes = new Hono<HonoEnv>();

signupRoutes.post(
  '/signup',
  zValidator(
    'json',
    z.object({
      email: z.string().trim(),
      emailOptIn: z.boolean().default(false),
      userStudyOptIn: z.boolean().default(false),
      source: z.string().optional(),
    }),
  ),
  async (c) => {
    const reqBody = c.req.valid('json');

    const checkEmail = ev.check(reqBody.email);
    if (!checkEmail.valid) {
      throw new HTTPException(400, { message: 'Email is invalid' });
    }

    const clientIp = c.req.header('cf-connecting-ip');

    const signupObj = {
      email: reqBody.email,
      signup_date: new Date().toISOString(),
      email_opt_in: reqBody.emailOptIn,
      user_study_opt_in: reqBody.userStudyOptIn,
      ip: clientIp ?? undefined,
      source: reqBody.source,
    };

    try {
      await mailerlite.createSubscriber(signupObj);
    } catch (err: any) {
      return c.json({ error: { message: `Error creating subscriber - ${err.message}` } }, 500);
    }

    return c.json({ success: true });
  },
);


signupRoutes.post(
  '/signup-test',
  async (c) => {
    return c.json({ success: true });
  },
);
