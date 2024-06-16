/* eslint-disable no-console */
import { InjectedDmnoEnvItem, injectDmnoGlobals } from 'dmno';
import { headers } from 'next/headers.js';

injectDmnoGlobals({
  onItemAccess: (item: InjectedDmnoEnvItem) => {
    // attempts to force the route into dynamic rendering mode so it wont put our our dynamic value into a pre-rendered page
    // however we have to wrap in try/catch because you can only call headers() within certain parts of the page... so it's not 100% foolproof
    if (item.dynamic) {
      // eslint-disable-next-line max-statements-per-line, no-empty
      try { headers(); } catch (err) {}
    }
  },
});

export const publicDynamicEnvObj: Record<string, any> = {};
const publicDynamicKeys = (globalThis as any)._DMNO_PUBLIC_DYNAMIC_KEYS as Array<string>;
for (const itemKey of publicDynamicKeys) {
  publicDynamicEnvObj[itemKey] = (globalThis as any).DMNO_PUBLIC_CONFIG[itemKey];
}
