const MAILERLITE_API_URL = 'https://connect.mailerlite.com/api';
const MAILERLITE_TOKEN = DMNO_CONFIG.MAILERLITE_TOKEN;

async function createSubscriber(signup: {
  email: string,
  email_opt_in?: boolean,
  signup_date: string, // iso date string
  user_study_opt_in?: boolean,
  ip?: string,
  source?: string,
}) {
  try {
    const response = await fetch(`${MAILERLITE_API_URL}/subscribers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MAILERLITE_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: signup.email,
        fields: {
          ...signup.user_study_opt_in && { user_study_opt_in: 1 },
          dmno_source: signup.source,
        },
        ip_address: signup.ip,
        ...signup.email_opt_in && {
          opted_in_at: signup.signup_date.replace('T', ' ').replace(/\..*Z/, ''),
          optin_ip: signup.ip,
        },
        groups: [DMNO_CONFIG.MAILERLITE_GROUP_ID],
      }),
    });
    return response.json();
  } catch (err) {
    throw new Error(`MailerLite API error: ${err}`);
  }
}

export default {
  createSubscriber,
};
