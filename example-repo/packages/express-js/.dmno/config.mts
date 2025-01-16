import { DmnoBaseTypes, defineDmnoService, pick } from 'dmno';

export default defineDmnoService({
  name: 'express-js',
  icon: 'skill-icons:expressjs-light',
  schema: {
    NODE_ENV: pick(),
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
