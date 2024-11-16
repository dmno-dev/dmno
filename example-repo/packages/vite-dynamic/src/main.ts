import { injectDmnoGlobals } from "dmno/inject-globals"

injectDmnoGlobals();

console.log({
  'DMNO_CONFIG.PUBLIC_STATIC': DMNO_CONFIG.PUBLIC_STATIC,
  'DMNO_CONFIG.SECRET_STATIC': DMNO_CONFIG.SECRET_STATIC,
  'DMNO_CONFIG.PUBLIC_DYNAMIC': DMNO_CONFIG.PUBLIC_DYNAMIC,
  'DMNO_CONFIG.SECRET_DYNAMIC': DMNO_CONFIG.SECRET_DYNAMIC,
});

// no TS error - silently resolves to `undefined`
console.log(process.env.DOES_NOT_EXIST);
// TS error - throws helpful error
console.log(DMNO_PUBLIC_CONFIG.SECRET_STATIC);


process.exit(1);
