import { defineConfigSchema, createDmnoDataType, DmnoBaseTypes } from '@dmno/core';
import * as _ from 'lodash';

// import { StripePublicKey } from '@dmno/types-registry';

const StripePublicKey = createDmnoDataType({
  extends: DmnoBaseTypes.string({
    startsWith: 'pk_',
  }),

  asyncValidate: async (val) => {
    // call to stripe
  }
});



defineConfigSchema({
  name: 'api2',
  schema: {
    THING_DELAY: {
      extends: DmnoBaseTypes.number({
        min: 1000,
        max: 10000,
      }),
    },

    STRIPE_PUBLIC_KEY_USING_PUBLISHED: {
      extends: StripePublicKey,
      required: true,
    },

    STRIPE_PUBLIC_KEY_USING_STRING: {
      extends: 'string',
      validate: (val) => val.matches(/pk_.*/),
      required: true,
    },
  },
})