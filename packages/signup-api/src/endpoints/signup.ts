import EmailValidation from 'emailvalid';
import * as async from 'async';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import mailerlite from 'src/lib/mailerlite';
import type { Context } from '@netlify/functions';

const ev = new EmailValidation({ allowFreemail: true });

function errorResponse(message: string, statusCode = 400) {
  return new Response(JSON.stringify({
    message,
  }), { status: statusCode });
}
function validResponse(obj: any) {
  return new Response(JSON.stringify(obj));
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
  if (req.method !== 'POST') return errorResponse('only POST supported');

  let reqBody;
  try {
    reqBody = await req.json();
  } catch (err) {
    return errorResponse(`Error parsing JSON body - ${err.message}`);
  }

  if (!reqBody.email) return errorResponse('email is missing');
  const checkEmail = ev.check(reqBody.email);
  if (!checkEmail.valid) return errorResponse('email is invalid');

  const clientIp = req.headers['x-nf-client-connection-ip'];

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
