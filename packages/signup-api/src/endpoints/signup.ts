import EmailValidation from 'emailvalid';
import * as async from 'async';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import mailerlite from 'src/lib/mailerlite';
import type { Context } from '@netlify/functions';

const ev = new EmailValidation({ allowFreemail: true });


const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};

function errorResponse(message: string, statusCode = 400) {
  return Response.json({
    message,
  }, { status: statusCode, headers: CORS_HEADERS });
}
function validResponse(obj: any) {
  return Response.json(obj, {
    headers: CORS_HEADERS,
  });
}


const serviceAccountAuth = new JWT({
  email: DMNO_CONFIG.GOOGLE_SHEETS_ACCOUNT_EMAIL,
  key: DMNO_CONFIG.GOOGLE_SHEETS_ACCOUNT_KEY.replaceAll('\\n', '\n'),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});
const signupsDoc = new GoogleSpreadsheet(DMNO_CONFIG.SIGNUPS_GOOGLE_SHEET_ID, serviceAccountAuth);

export default async (req: Request, context: Context) => {
  // TODO: extract this to helper... set more strict in prod
  if (req.method === 'OPTIONS') {
    return new Response(undefined, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('only POST supported');
  }

  let reqBody;
  try {
    reqBody = await req.json();
  } catch (err) {
    return errorResponse(`Error parsing JSON body - ${err.message}`);
  }

  if (!reqBody.email) return errorResponse('email is missing');
  const checkEmail = ev.check(reqBody.email);
  if (!checkEmail.valid) return errorResponse('email is invalid');

  // set by netlify in deployed envs
  const clientIp = req.headers.get('x-nf-client-connection-ip');

  const signupObj = {
    email: reqBody.email,
    signup_date: new Date().toISOString(),
    email_opt_in: !!reqBody.emailOptIn,
    user_study_opt_in: !!reqBody.userStudyOptIn,
    ip: clientIp,
    source: reqBody.source,
  };

  await async.parallel([
    async () => await mailerlite.createSubscriber(signupObj),
    async () => {
      try {
        // push signup to google sheets
        await signupsDoc.loadInfo();
        await signupsDoc.sheetsByIndex[0].addRow(signupObj);
      } catch (err) {
        console.log('Failed writing data to google sheet', signupObj);
        console.log(err);
      }
    },
  ]);

  return validResponse({ success: true });
};
