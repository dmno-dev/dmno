import { DmnoBaseTypes, defineDmnoService, pick } from 'dmno';

export default defineDmnoService({
  name: 'nuxt',
  icon: 'devicon-plain:nuxtjs',
  schema: {
    NODE_ENV: pick(),
    PUBLIC_EXAMPLE: {
      value: 'public!',
    },
    SECRET_EXAMPLE: {
      value: 'private!',
    }
  }
});
