import { ZodError, ZodSchema } from 'zod';

import { zValidator as zv } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import type { Hono, ValidationTargets } from 'hono';

export const zValidator = <
  T extends ZodSchema,
  Target extends keyof ValidationTargets,
>(
    target: Target,
    schema: T,
  ) => zv(target, schema, (result, c) => {
    if (!result.success) {
      (result.error as any)._zValidatorError = true;
      throw result.error;
    }
  });

function getZodErrorMessage(e: ZodError) {
  const firstIssue = e.issues[0];
  const issuePath = firstIssue.path.join('.');
  if (firstIssue.message === 'Required') {
    return `Missing required input \`${issuePath}\``;
  } else {
    return `Invalid input \`${issuePath}\` - ${firstIssue.message}`;
  }
}

export function initErrorHandler(app: Hono<any, any, any>) {
  app.onError((err, c) => {
    if (err instanceof ZodError && (err as any)._zValidatorError) {
      return c.json({
        error: {
          message: getZodErrorMessage(err),
          issues: err.issues,
        },
      }, 400);
    } else if (err instanceof HTTPException) {
      // Get the custom response
      return c.json({
        error: {
          message: err.message,
        },
      }, err.status);
    } else {
      return c.json({ error: { message: 'unexpected error' } }, 500);
    }
  });
}
