import { createDmnoDataType, DmnoBaseTypes } from './configraph-adapter';

//! IMPORTANT - without this import, TS gets confused about these being the same thing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ConfigraphDataTypeFactoryFn } from '@dmno/configraph';

// example of defining common type using our base types
export const NodeEnvType = createDmnoDataType({
  // TODO: might want to split the base types from these? (both in "dmno/" for now)
  typeLabel: 'dmno/nodeEnv',
  ui: { icon: 'solar:flag-bold' },

  typeDescription: 'standard environment flag for Node.js',
  extends: DmnoBaseTypes.enum({
    development: { description: 'true during local development' },
    test: { description: 'true while running tests' },
    production: { description: 'true for production' },
  }),
  // we'll set the default value, and assume it will be passed in via the environment to override
  value: 'development',
});

