import type { DmnoGeneratedPublicConfigSchema, DmnoGeneratedConfigSchema } from '../.dmno/.typegen/schema';

declare module 'vue' {
  interface ComponentCustomProperties {
    DMNO_PUBLIC_CONFIG: DmnoGeneratedPublicConfigSchema;
    DMNO_CONFIG: DmnoGeneratedConfigSchema;
  }
}
