// /Users/theo/dmno/dmno-reactivity/example-repo/packages/astro-web/.dmno/config.mts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["getResolverCtx"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["DmnoBaseTypes","defineDmnoService"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/@fs/Users/theo/dmno/dmno-reactivity/packages/plugins/1password/dist/index.js", {"importedNames":["OnePasswordDmnoPlugin","OnePasswordTypes"]});



const OnePassBackend = __vite_ssr_import_2__.OnePasswordDmnoPlugin.injectInstance("1pass");
__vite_ssr_exports__.default = __vite_ssr_import_1__.defineDmnoService({
  name: "astroweb",
  parent: "group1",
  settings: {
    dynamicConfig: "default_static"
  },
  icon: "devicon-plain:astro",
  pick: [
    "NODE_ENV",
    "DMNO_ENV",
    {
      source: "api",
      key: "API_URL"
    },
    "SOME_API_KEY"
  ],
  schema: {
    OP_TOKEN: { extends: __vite_ssr_import_2__.OnePasswordTypes.serviceAccountToken },
    FOO: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.string({ startsWith: "foo-" }),
      value: "foo-config-value",
      description: 'test of non-sensitive env var WITHOUT "PUBLIC_" prefix'
    },
    PUBLIC_FOO: {
      value: "public-foo-config-value",
      description: 'test of non-sensitive env var WITH "PUBLIC_" prefix'
    },
    SECRET_FOO: {
      value: "secret-foo-config-value",
      sensitive: true,
      required: true,
      description: "test of a sensitive env var"
    },
    EMPTY: {
      description: "empty item, should be undefined, but not throw"
    },
    FN_FOO: {
      value: () => `fn-prefix-${__vite_ssr_import_0__.getResolverCtx().get("FOO")}`
    },
    PUBLIC_DYNAMIC: {
      value: "public-dynamic-init",
      dynamic: true
    },
    PUBLIC_STATIC: {
      value: "public-static-init"
    },
    SECRET_STATIC: {
      value: "secret-static",
      dynamic: false,
      sensitive: true
    },
    SECRET_DYNAMIC: {
      value: "secret-dynamic",
      dynamic: true,
      sensitive: true
    },
    STRIPE_SECRET_KEY: {
      sensitive: {
        allowedDomains: ["api.stripe.com"]
      },
      value: "my-stripe-secret-key",
      required: true
    },
    SOME_SECRET_API_KEY: {
      // this is in the output of a page that will be stopped by our secret leak detector
      value: "Cappuccino",
      sensitive: true
    }
  }
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7OztBQUFBO0FBQ0E7QUFFQTtBQUVBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLElBQ0E7QUFBQSxJQUVBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQSwwQkFBZ0MsaURBQWU7QUFBQSxJQUMvQztBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUVBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxRQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBRUE7QUFBQTtBQUFBLE1BRUE7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0E7QUFDQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiY29uZmlnLm10cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEbW5vQmFzZVR5cGVzLCBkZWZpbmVEbW5vU2VydmljZSB9IGZyb20gJ2Rtbm8nO1xuaW1wb3J0IHsgT25lUGFzc3dvcmREbW5vUGx1Z2luLCBPbmVQYXNzd29yZFR5cGVzIH0gZnJvbSAnQGRtbm8vMXBhc3N3b3JkLXBsdWdpbic7XG5cbmNvbnN0IE9uZVBhc3NCYWNrZW5kID0gT25lUGFzc3dvcmREbW5vUGx1Z2luLmluamVjdEluc3RhbmNlKCcxcGFzcycpO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVEbW5vU2VydmljZSh7XG4gIG5hbWU6ICdhc3Ryb3dlYicsXG4gIHBhcmVudDogJ2dyb3VwMScsXG4gIHNldHRpbmdzOiB7XG4gICAgZHluYW1pY0NvbmZpZzogJ2RlZmF1bHRfc3RhdGljJyxcbiAgfSxcbiAgaWNvbjogJ2Rldmljb24tcGxhaW46YXN0cm8nLFxuICBwaWNrOiBbXG4gICAgJ05PREVfRU5WJyxcbiAgICAnRE1OT19FTlYnLFxuICAgIHtcbiAgICAgIHNvdXJjZTogJ2FwaScsXG4gICAgICBrZXk6ICdBUElfVVJMJyxcbiAgICB9LFxuICAgICdTT01FX0FQSV9LRVknLFxuICBdLFxuICBzY2hlbWE6IHtcbiAgICBPUF9UT0tFTjogeyBleHRlbmRzOiBPbmVQYXNzd29yZFR5cGVzLnNlcnZpY2VBY2NvdW50VG9rZW4gfSxcblxuICAgIEZPTzoge1xuICAgICAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5zdHJpbmcoeyBzdGFydHNXaXRoOiAnZm9vLScgfSksXG4gICAgICB2YWx1ZTogJ2Zvby1jb25maWctdmFsdWUnLFxuICAgICAgZGVzY3JpcHRpb246ICd0ZXN0IG9mIG5vbi1zZW5zaXRpdmUgZW52IHZhciBXSVRIT1VUIFwiUFVCTElDX1wiIHByZWZpeCcsXG4gICAgfSxcbiAgICBQVUJMSUNfRk9POiB7XG4gICAgICB2YWx1ZTogJ3B1YmxpYy1mb28tY29uZmlnLXZhbHVlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAndGVzdCBvZiBub24tc2Vuc2l0aXZlIGVudiB2YXIgV0lUSCBcIlBVQkxJQ19cIiBwcmVmaXgnLFxuICAgIH0sXG4gICAgU0VDUkVUX0ZPTzoge1xuICAgICAgdmFsdWU6ICdzZWNyZXQtZm9vLWNvbmZpZy12YWx1ZScsXG4gICAgICBzZW5zaXRpdmU6IHRydWUsXG4gICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAndGVzdCBvZiBhIHNlbnNpdGl2ZSBlbnYgdmFyJyxcbiAgICB9LFxuICAgIEVNUFRZOiB7XG4gICAgICBkZXNjcmlwdGlvbjogJ2VtcHR5IGl0ZW0sIHNob3VsZCBiZSB1bmRlZmluZWQsIGJ1dCBub3QgdGhyb3cnLFxuICAgIH0sXG4gICAgRk5fRk9POiB7XG4gICAgICB2YWx1ZTogKCkgPT4gYGZuLXByZWZpeC0ke0RNTk9fQ09ORklHLkZPT31gLFxuICAgIH0sXG4gICAgUFVCTElDX0RZTkFNSUM6IHtcbiAgICAgIHZhbHVlOiAncHVibGljLWR5bmFtaWMtaW5pdCcsXG4gICAgICBkeW5hbWljOiB0cnVlLFxuICAgIH0sXG4gICAgUFVCTElDX1NUQVRJQzoge1xuICAgICAgdmFsdWU6ICdwdWJsaWMtc3RhdGljLWluaXQnLFxuICAgIH0sXG5cbiAgICBTRUNSRVRfU1RBVElDOiB7XG4gICAgICB2YWx1ZTogJ3NlY3JldC1zdGF0aWMnLFxuICAgICAgZHluYW1pYzogZmFsc2UsXG4gICAgICBzZW5zaXRpdmU6IHRydWUsXG4gICAgfSxcbiAgICBTRUNSRVRfRFlOQU1JQzoge1xuICAgICAgdmFsdWU6ICdzZWNyZXQtZHluYW1pYycsXG4gICAgICBkeW5hbWljOiB0cnVlLFxuICAgICAgc2Vuc2l0aXZlOiB0cnVlLFxuICAgIH0sXG5cbiAgICBTVFJJUEVfU0VDUkVUX0tFWToge1xuICAgICAgc2Vuc2l0aXZlOiB7XG4gICAgICAgIGFsbG93ZWREb21haW5zOiBbJ2FwaS5zdHJpcGUuY29tJ10sXG4gICAgICB9LFxuICAgICAgdmFsdWU6ICdteS1zdHJpcGUtc2VjcmV0LWtleScsXG4gICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB9LFxuXG4gICAgU09NRV9TRUNSRVRfQVBJX0tFWToge1xuICAgICAgLy8gdGhpcyBpcyBpbiB0aGUgb3V0cHV0IG9mIGEgcGFnZSB0aGF0IHdpbGwgYmUgc3RvcHBlZCBieSBvdXIgc2VjcmV0IGxlYWsgZGV0ZWN0b3JcbiAgICAgIHZhbHVlOiAnQ2FwcHVjY2lubycsXG4gICAgICBzZW5zaXRpdmU6IHRydWUsXG4gICAgfVxuICB9LFxufSlcbiJdLCJmaWxlIjoiL1VzZXJzL3RoZW8vZG1uby9kbW5vLXJlYWN0aXZpdHkvZXhhbXBsZS1yZXBvL3BhY2thZ2VzL2FzdHJvLXdlYi8uZG1uby9jb25maWcubXRzIn0=
