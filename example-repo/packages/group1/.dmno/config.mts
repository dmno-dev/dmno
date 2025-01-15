import { DmnoBaseTypes, defineDmnoService, pick } from 'dmno';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const OnePassBackend = OnePasswordDmnoPlugin.injectInstance('1pass');

export default defineDmnoService({
  name: 'group1',
  schema: {
    PICK_TEST_G1: {
      extends: pick('root', 'PICK_TEST'),
      // TODO: reimpliment transforms
      // transformValue: (val) => `${val}-group1transform`,
    },
    GROUP1_THINGY: {
      extends: DmnoBaseTypes.number,
      description: 'thing related to only group1',
    },
    OP_TEST: {
      value: OnePassBackend.item(),
    }
  },
});
