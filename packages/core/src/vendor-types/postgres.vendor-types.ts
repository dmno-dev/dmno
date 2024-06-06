import { createDmnoDataType, ValidationError } from 'dmno';

const PG_REGEX = /(postgres(?:ql)?):\/\/(?:([^@\s]+)@)?([^/\s]+)(?:\/(\w+))?(?:\?(.+))?/;
const ConnectionString = createDmnoDataType({
  typeLabel: 'postgres/connectionString',
  extends: 'string',
  sensitive: true,
  typeDescription: 'Postgres connection url',
  externalDocs: {
    description: 'explanation from prisma docs',
    url: 'https://www.prisma.io/dataguide/postgresql/short-guides/connection-uris#a-quick-overview',
  },
  ui: {
    icon: 'akar-icons:postgresql-fill',
    color: '336791', // postgres brand color :)
  },

  validate(val, ctx) {
    if (!PG_REGEX.test(val)) return new ValidationError('Invalid postgres connection url');
  },
});

/**
 * Placeholder for a few vendor specific data types...
 * these will be extracted into separate modules!
 */
export const PostgresDataTypes = {
  ConnectionString,
};
