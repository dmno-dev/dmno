import { DmnoBaseTypes, defineDmnoService } from 'dmno';

export default defineDmnoService({
  name: 'nuxt',
  icon: 'devicon-plain:nuxtjs',
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
