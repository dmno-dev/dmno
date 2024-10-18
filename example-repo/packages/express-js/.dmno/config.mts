import { DmnoBaseTypes, defineDmnoService, switchByNodeEnv } from 'dmno';

export default defineDmnoService({
  name: 'express-js',
  icon: 'skill-icons:expressjs-light',
  pick: [
    'NODE_ENV',
  ],
  schema: {
    PUBLIC_EXAMPLE: {
      value: 'public!',
    },
    SECRET_EXAMPLE: {
      value: 'private!',
    },
    PORT: {
      extends: 'number',
      value: 3000,
      required: true,
      description: 'The port the app should listen on'
    }
  }
});
