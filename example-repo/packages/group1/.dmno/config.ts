import { defineConfigSchema } from '@dmno/core';

export default defineConfigSchema({
  name: 'group1',
  schema: {
    GROUP1_THINGY: {
      description: 'thing related to only group1',
    },
  },
});