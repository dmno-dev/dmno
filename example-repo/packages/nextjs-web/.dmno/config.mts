import { defineDmnoService, pick } from 'dmno';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const OnePassBackend = OnePasswordDmnoPlugin.injectInstance('1pass');

export default defineDmnoService({
  name: 'nextweb',
  parent: 'group1',
  icon: 'devicon-plain:nextjs',
  settings: {
    dynamicConfig: 'default_static',
    // dynamicConfig: 'only_static',
    redactSensitiveLogs: true,
    interceptSensitiveLeakRequests: true,
    preventClientLeaks: true,
  },
  schema: {
    NODE_ENV: pick(),
    DMNO_ENV: pick(),
    NEXT_PUBLIC_API_URL: pick('api', 'API_URL'),
    PICK_TEST_NW: {
      extends: pick('group1', 'PICK_TEST_G1'),
      // TODO: reimplement
      // transformValue: (val) => `${val}-nextwebtransform`,
    },
    FOO: {
      value: 'foo',
      description: 'test of a public env var without a NEXT_PUBLIC_ prefix',
    },
    SECRET_FOO: {
      value: 'secret-foo',
      sensitive: true,
      required: true,
      description: 'test of a sensitive env var',
    },

    EMPTY: {
      description: 'empty item, should be undefined',
    },

    
    PUBLIC_STATIC: {
      value: 'public-static-default',
    },
    PUBLIC_DYNAMIC: {
      value: 'public-dynamic-default',
      dynamic: true,
    },

    PUBLIC_DYNAMIC2: {
      value: 'public-dynamic-default another!',
      dynamic: true,
    },


    SECRET_STATIC: {
      value: 'secret-static-default',
      sensitive: true,
    },
    SECRET_DYNAMIC: {
      value: 'secret-dynamic-default',
      dynamic: true,
      sensitive: true,
      required: true,
    },

    STRIPE_SECRET_KEY: {
      value: 'stripe-secret-key',
      dynamic: true,
      required: true,
      sensitive: {
        allowedDomains: ['api.stripe.com'],
      }
    },
    
    NEXT_PUBLIC_STATIC: {
      value: () => DMNO_CONFIG.PUBLIC_STATIC,
    },

    SECRET_MIDDLEWARE_TEST: {
      // this is in the output of a page that will be stopped by our secret leak detector
      value: 'Cappuccino',
      sensitive: true,
    }
  },
});
