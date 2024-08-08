import { DmnoBaseTypes, defineDmnoService } from 'dmno';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const OnePassBackend = OnePasswordDmnoPlugin.injectInstance('1pass/prod');

export default defineDmnoService({
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
    OP_TEST: {
      value: OnePassBackend.item(),
    }
  },
});
