import { patchGlobalConsoleToRedactSecrets } from '../lib/redaction-helpers';

export { unmaskSecret } from '../lib/redaction-helpers';

patchGlobalConsoleToRedactSecrets((globalThis as any)._DMNO_SENSITIVE_LOOKUP);
