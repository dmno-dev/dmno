import { DmnoBaseTypes, defineDmnoService } from 'dmno';

export default defineDmnoService({
  pick: [],
  settings: {
    preventClientLeaks: true
  },
  schema: {
    PORT: {
      extends: DmnoBaseTypes.port,
      value: 3001
    },
    SOME_SECRET: {
      value: 'shhh-dont-leak-me',
      sensitive: true,
    }
  },
});
