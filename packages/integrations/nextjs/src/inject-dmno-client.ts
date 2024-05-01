console.log('injected DMNO into client code');

window.DMNO_CONFIG = new Proxy({}, {
  get(o, key) {
    throw new Error(`💥 \`DMNO_CONFIG\` is not accessible on the client, use \`DMNO_PUBLIC_CONFIG.${key.toString()}\` instead`);
  },
});




declare const window: any;
declare const XMLHttpRequest: any;

window.DMNO_PUBLIC_CONFIG = new Proxy({}, {
  get(o, key) {
    // TODO: let user opt-in/out
    // TODO: some smarter caching?
    if (!window._DMNO_DYNAMIC_PUBLIC_CONFIG) {
      const request = new XMLHttpRequest();
      request.open('GET', '/fetch-dynamic-public-config', false); // false means sync/blocking!
      request.send(null);

      if (request.status !== 200) {
        throw new Error('Failed to load public dynamic config');
      }
      window._DMNO_PUBLIC_DYNAMIC_CONFIG = JSON.parse(request.responseText);

      console.log('loaded public dynamic config', window._DMNO_PUBLIC_DYNAMIC_CONFIG);
    }

    // TODO: probably should handle config items that are defined but have a value of undefined
    if (key in window._DMNO_PUBLIC_DYNAMIC_CONFIG) {
      return window._DMNO_PUBLIC_DYNAMIC_CONFIG[key];
    }

    throw new Error(`💥 \`DMNO_PUBLIC_CONFIG.${key.toString()}\` does not exist in your config, or it is sensitive `);
  },
});
