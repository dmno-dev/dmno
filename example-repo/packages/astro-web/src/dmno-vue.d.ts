/*
Extra file required if you want to use dmno globals within vue templates
also need to inject into `app.config.globalProperties`
*/
import type { DmnoGeneratedPublicConfigSchema, DmnoGeneratedConfigSchema } from "../.dmno/.typegen/schema";

declare module 'vue' {
  interface ComponentCustomProperties {
    DMNO_PUBLIC_CONFIG: DmnoGeneratedPublicConfigSchema;
    DMNO_CONFIG: DmnoGeneratedConfigSchema;
  }
}
