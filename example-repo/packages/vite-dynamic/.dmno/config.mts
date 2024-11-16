import { DmnoBaseTypes, defineDmnoService } from 'dmno';

export default defineDmnoService({
  settings: {
    dynamicConfig: 'default_static'
  },
  schema: {
    PUBLIC_STATIC: { value: 'public-static' },
    SECRET_STATIC: { value: 'secret-static', sensitive: true },
    PUBLIC_DYNAMIC: { value: 'public-dynamic', dynamic: true },
    SECRET_DYNAMIC: { value: 'secret-dynamic', dynamic: true, sensitive: true },
  },
});
