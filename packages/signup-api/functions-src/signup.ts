import EmailValidation from 'emailvalid';
import { PagesFunction, type Response as CFResponse } from '@cloudflare/workers-types';
import mailerlite from './lib/mailerlite';

const ev = new EmailValidation({ allowFreemail: true });

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
  }) as unknown as CFResponse;
};

// Set CORS to all responses
export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Headers', '*');
  response.headers.set('Access-Control-Allow-Methods', '*');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
};



export const onRequestPost: PagesFunction = async (context) => {
  // TODO: type reqBody
  let reqBody: any;
  try {
    reqBody = await context.request.json();
  } catch (err: any) {
    return new Response(`Error parsing JSON body - ${err.message}`, { status: 400 }) as unknown as CFResponse;
  }

  if (!reqBody.email) return new Response('email is missing', { status: 400 }) as unknown as CFResponse;
  const checkEmail = ev.check(reqBody.email);
  if (!checkEmail.valid) return new Response('email is invalid', { status: 400 }) as unknown as CFResponse;

  const clientIp = context.request.headers.get('cf-connecting-ip');

  const signupObj = {
    email: reqBody.email,
    signup_date: new Date().toISOString(),
    email_opt_in: !!reqBody.emailOptIn,
    user_study_opt_in: !!reqBody.userStudyOptIn,
    ip: clientIp ?? undefined,
    source: reqBody.source,
  };

  try {
    await mailerlite.createSubscriber(signupObj);
  } catch (err: any) {
    return new Response(`Error creating subscriber - ${err.message}`, { status: 500 }) as unknown as CFResponse;
  }

  return new Response('ok', { status: 200 }) as unknown as CFResponse;
};
