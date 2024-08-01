import { DmnoBaseTypes, defineDmnoService } from 'dmno';

export default defineDmnoService({
  name: 'remix-basic',
  pick: [],
  settings: {
    dynamicConfig: 'default_static',
    redactSensitiveLogs: true,
    // preventClientLeaks: false,
  },
  schema: {
    PUBLIC_STATIC: {
      value: 'public-static-build',
    },
    PUBLIC_DYNAMIC: {
      value: 'public-dynamic-build',
      dynamic: true,
    },

    SECRET_STATIC: {
      value: 'secret-static-build',
      sensitive: true,
    },
    SECRET_DYNAMIC: {
      value: 'secret-dynamic-build',
      sensitive: true,
      dynamic: true,
    },

    STRIPE_SECRET_KEY: {
      value: 'super-secret-stripe-key',
      sensitive: true,
    },

    // INVALID_ITEM: {
    //   required: true,
    // }
  },
});
