import { DmnoBaseTypes, defineConfigSchema } from '@dmno/core';

export default defineConfigSchema({
  name: 'group1',
  pick: [
    {
      source: 'root',
      key: 'PICK_TEST',
      renameKey: 'PICK_TEST_G1',
      transformValue: (val) => `${val}-group1transform`,
    }
  ],
  schema: {
    GROUP1_THINGY: {
      extends: DmnoBaseTypes.number,
      description: 'thing related to only group1',
    },
  },
});