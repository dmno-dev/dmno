import { defineDmnoService, DmnoBaseTypes, switchBy, processEnvOverrideLoader, pick } from 'dmno';
import { OnePasswordDmnoPlugin, onePasswordOverrideLoader } from '@dmno/1password-plugin';
import { EncryptedVaultDmnoPlugin } from '@dmno/encrypted-vault-plugin';

const OnePassBackend = OnePasswordDmnoPlugin.injectInstance('1pass');
const VaultPlugin = EncryptedVaultDmnoPlugin.injectInstance('vault/prod');

export default defineDmnoService({
  name: 'api',
  parent: 'group1',
  overrides: [
    processEnvOverrideLoader(),
    // personal overrides, create item in "Employee" vault with this name, item label must match 
    onePasswordOverrideLoader({ reference: 'op://Employee/dmno-local-dev-overrides/api' }),
    // shared overrides
    onePasswordOverrideLoader({ reference: 'op://dev test/rznyyjrwcv5sgc4ykjhzpkoevm/api' }),
  ],
  schema: {
    NODE_ENV: pick(),
    DMNO_ENV: pick(),
    OVERRIDE_ME: {
      value: 'default'
    },

    OP_ITEM_1: {
      value: OnePassBackend.item(),
    },

    PUBLIC_EXAMPLE: {
      value: 'non sensitive',
    },

    SECRET_FOO: {
      value: 'secret-foo-value',
      sensitive: {
        allowedDomains: ['*']
      },
    },

    STRIPE_SECRET_KEY: {
      value: 'fake-stripe-secret-key',
      required: true,
      sensitive: {
        allowedDomains: ['api.stripe.com'],
      },
    },

    ANOTHER_SECRET: {
      value: 'xxxyyyyzzz',
      sensitive: {
        redactMode: 'show_first_last'
      },
    },

    SECRET_EXAMPLE: {
      extends: DmnoBaseTypes.string,
      required: true,
      value: OnePassBackend.itemByLink("https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&h=dmnoinc.1password.com&i=bphvvrqjegfmd5yoz4buw2aequ&v=ut2dftalm3ugmxc6klavms6tfq", 'username'),
      sensitive: true,
    },
    SWITCHED_EXAMPLE: {
      value: switchBy('NODE_ENV', {
        _default: OnePassBackend.itemByReference("op://dev test/example/username"),
        staging: OnePassBackend.itemByReference("op://dev test/example/username"),
        production: OnePassBackend.itemByReference("op://dev test/example/username"),
      }),
    },

    API_ONLY: {
      value: 'set via dmno'
      // value: VaultPlugin.item(),
    },

    BOOL_NUM_FLAG: {
      extends: 'boolean',
    },

    A_NEW_ITEM: {
      value: "phil 1"
    }, 
    PORT: {
      description: 'port number to listen on',
      extends: DmnoBaseTypes.number({ max: 9999 }),
      required: true,
      value: 9000,
    },
    API_URL: {
      description: 'public url of this service',
      extends: DmnoBaseTypes.string({}),
      value: switchBy('NODE_ENV', {
        _default: () => `http://localhost:${DMNO_CONFIG.PORT}`,
        // staging: valueCreatedDuringDeployment(),
        production: 'https://api.dmnoexampleapp.com',
      })
    },

    DB_URL: { // intellisense demo
      summary: 'Primary DB URL',
      required: true,
      description: 'houses all of our users, products, and orders data',
      typeDescription: 'Postgres connection url',
      externalDocs: {
        description: 'explanation (from prisma docs)',
        url: 'https://www.prisma.io/dataguide/postgresql/short-guides/connection-uris#a-quick-overview',
      },
      ui: {
        // uses iconify names, see https://icones.js.org for options
        icon: 'akar-icons:postgresql-fill',
        color: '336791', // postgres brand color :)
      },
      sensitive: true,
      value: 'postgres://localhost:5432/my-api-db'
    },
  },
});
