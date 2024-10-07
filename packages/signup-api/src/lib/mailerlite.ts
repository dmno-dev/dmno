import Axios from 'axios';

const mailerLiteApi = Axios.create({
  baseURL: 'https://connect.mailerlite.com/api',
  headers: {
    Authorization: `Bearer ${DMNO_CONFIG.MAILERLITE_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});



async function createSubscriber(signup: {
  email: string,
  email_opt_in?: boolean,
  signup_date: string, // iso date string
  user_study_opt_in?: boolean,
  ip?: string,
  source?: string,
}) {
  try {
    const result = await mailerLiteApi.post('/subscribers', {
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
    });

    console.log('ML result', result.data);
  } catch (err) {
    console.log(err);
  }
}

export default {
  createSubscriber,
};
