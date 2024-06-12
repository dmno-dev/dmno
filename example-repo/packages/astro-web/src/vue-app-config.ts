import type { App } from 'vue';

export default (app: App) => {
  app.config.globalProperties.DMNO_CONFIG = (globalThis as any).DMNO_CONFIG;
  app.config.globalProperties.DMNO_PUBLIC_CONFIG = (globalThis as any).DMNO_PUBLIC_CONFIG;
};
