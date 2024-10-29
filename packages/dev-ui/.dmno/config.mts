import { DmnoBaseTypes, defineDmnoService } from 'dmno';

export default defineDmnoService({
  name: 'dev-ui',
  pick: [],
  schema: {
    DEV: {},
    NODE_ENV: {},
  },
});
