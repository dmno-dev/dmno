(process as any).dmnoEnv = new Proxy({}, {
  get(o, key) {
    // console.log('get process.dmnoEnv', key);
    throw new Error(`💥 Unable to access process.dmnoEnv in the client! Use \`DMNO_PUBLIC_CONFIG.${key.toString()}\` instead`);
  },
});

// @ts-ignore
window.DMNO_PUBLIC_CONFIG = new Proxy({}, {
  get(o, key) {
    throw new Error(`💥 \`DMNO_PUBLIC_CONFIG.${key.toString()}\` does not exist in your config, or it is sensitive `);
  },
});
