import { DmnoBaseTypes, defineDmnoService, switchByNodeEnv } from 'dmno';

export default defineDmnoService({
  name: 'nuxt',
  pick: [
    'NODE_ENV',
  ],
  schema: {
    PUBLIC_EXAMPLE: {
      value: 'public!',
    },
    SECRET_EXAMPLE: {
      value: 'private!',
    }
  }
});
