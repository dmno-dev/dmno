import { DmnoBaseTypes, defineDmnoService } from 'dmno';

export default defineDmnoService({
  name: 'dev-ui',
  pick: [],
  schema: {
    GITHUB_OAUTH_CLIENT_ID: {
      value: 'Ov23litKQTk5TJBIAtM2', // local dev app
    },
    DEV: {
    },
    VITE_DELAY_API_REQUESTS: {

    },
    NODE_ENV: {
    },
  },
});
