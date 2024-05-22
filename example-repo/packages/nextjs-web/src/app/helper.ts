import '@dmno/nextjs-integration/inject';

console.log('\n>>> helper file loaded');
console.log('> process.env.DMNO_INJECTED_ENV', !!process.env.DMNO_INJECTED_ENV);
console.log('> DMNO_CONFIG?', !!(globalThis as any).DMNO_CONFIG);
// console.log(globalThis);

// fails during build - DMNO_CONFIG not defined
console.log('next helper file', {
  'SECRET_DYNAMIC': DMNO_CONFIG.SECRET_DYNAMIC, 
  'SECRET_STATIC': DMNO_CONFIG.SECRET_STATIC, 
  'PUBLIC_DYNAMIC': DMNO_CONFIG.PUBLIC_DYNAMIC, 
  'PUBLIC_STATIC': DMNO_CONFIG.PUBLIC_STATIC, 
});

// works because it gets rewritten
// console.log('next helper file', DMNO_CONFIG.SECRET_STATIC);
