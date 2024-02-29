import { DmnoBaseTypes, defineConfigSchema } from '@dmno/core';

export default defineConfigSchema({
  name: 'group1',
  schema: {
    GROUP1_THINGY: {
      extends: DmnoBaseTypes.number,
      description: 'thing related to only group1',
    },
  },
});