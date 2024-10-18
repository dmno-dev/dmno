// /Users/theo/dmno/dmno-reactivity/example-repo/packages/webapp/.dmno/config.mts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["getResolverCtx"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["DmnoBaseTypes","cacheFunctionResult","createDmnoDataType","defineDmnoService","switchBy"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/@fs/Users/theo/dmno/dmno-reactivity/packages/plugins/1password/dist/index.js", {"importedNames":["OnePasswordDmnoPlugin"]});



const OnePassBackend = __vite_ssr_import_2__.OnePasswordDmnoPlugin.injectInstance("1pass");
const customUrlType = __vite_ssr_import_1__.createDmnoDataType({
  typeLabel: "my-custom-url",
  extends: __vite_ssr_import_1__.DmnoBaseTypes.url({
    prependProtocol: true,
    normalize: true
  }),
  summary: "summary from custom type"
});
__vite_ssr_exports__.default = __vite_ssr_import_1__.defineDmnoService({
  name: "web",
  parent: "group1",
  icon: "file-icons:vite",
  settings: {
    dynamicConfig: "only_static"
  },
  pick: [
    "NODE_ENV",
    "DMNO_ENV",
    // 'GOOGLE_ANALYTICS_MEASUREMENT_ID',
    {
      source: "api",
      key: "API_URL",
      renameKey: "VITE_API_URL"
    },
    {
      source: "group1",
      // picking the renamed key from group1
      key: "PICK_TEST_G1",
      renameKey: "PICK_TEST_W",
      // should apply _after_ the group1 transform
      transformValue: (val) => `${val}-webtransform`
    }
  ],
  schema: {
    // OP_ITEM_1: {
    //   sensitive: true,
    //   value: OnePassBackend.item(),
    // },
    // EX1: {
    //   value: () => getResolverCtx().get('BOOLEAN_EXAMPLE'),
    // },
    ENUM_EXAMPLE: {
      ui: {
        icon: "bi:apple",
        color: "FF0000"
      },
      extends: __vite_ssr_import_1__.DmnoBaseTypes.enum([
        { description: "dX", value: "before" },
        { description: "dX", value: "after" },
        { description: "dX", value: false }
      ])
    },
    VITE_STATIC_VAL_STR: {
      summary: "cool neat thing",
      sensitive: true,
      // extends: DmnoBaseTypes.string({ startsWith: 'foo_' }),
      description: "longer text about what this super cool thing is for!",
      value: "static",
      externalDocs: {
        description: "explanation from prisma docs",
        url: "https://www.prisma.io/dataguide/postgresql/short-guides/connection-uris#a-quick-overview"
      },
      ui: {
        // uses iconify names, see https://icones.js.org for options
        icon: "akar-icons:postgresql-fill",
        color: "336791"
        // postgres brand color :)
      }
    },
    SWITCH_EXAMPLE: {
      value: __vite_ssr_import_1__.switchBy("NODE_ENV", {
        _default: "default-val",
        staging: "staging-value",
        production: () => `prod-${__vite_ssr_import_0__.getResolverCtx().get("NODE_ENV")}`
      })
    },
    BOOLEAN_EXAMPLE: {
      description: "this is a required boolean config item",
      required: true,
      value: false
    },
    BOOLEAN_OPPOSITE: {
      extends: "boolean",
      value: () => !__vite_ssr_import_0__.getResolverCtx().get("BOOLEAN_EXAMPLE")
    },
    SIMPLE_OBJECT: {
      extends: "simpleObject",
      value: { foo: 1, bar: "biz" }
    },
    RANDOM_NUM: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.number,
      description: "random number that will change each time config resolution runs",
      required: true,
      value: () => Math.floor(Math.random() * 100)
    },
    CACHED_RANDOM_NUM: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.number,
      description: "random number that is cached, so should stay constant until cache is cleared",
      required: true,
      value: __vite_ssr_import_1__.cacheFunctionResult(() => Math.floor(Math.random() * 100))
    },
    VITE_STATIC_VAL_NUM: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.number({
        precision: 1,
        max: 100,
        min: 1
      }),
      value: "12.45"
    },
    WEB_URL: {
      extends: customUrlType({ newSetting: true }),
      description: "public url of this web app",
      expose: true
      // required: true,
      // value: 'EXAMPLE',
    },
    ANOTHER: {
      value: 123
    },
    PUBLIC_STATIC: {
      value: "ps-init"
    },
    PUBLIC_DYNAMIC: {
      dynamic: true,
      value: "pd-init"
    },
    SECRET_STATIC: {
      sensitive: true,
      value: "ss-init"
    },
    SECRET_DYNAMIC: {
      sensitive: true,
      dynamic: true,
      value: "sd-init"
    }
  }
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7OztBQUFBO0FBQ0E7QUFFQTtBQUVBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0E7QUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBO0FBQUEsTUFFQTtBQUFBLE1BQ0E7QUFBQTtBQUFBLE1BRUE7QUFBQSxJQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBVUE7QUFBQSxNQUVBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUE7QUFBQSxNQUVBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUE7QUFBQSxRQUVBO0FBQUEsUUFDQTtBQUFBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQSwwQkFBa0Msc0RBQW9CO0FBQUEsTUFDdEQ7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0EsY0FBb0I7QUFBQSxJQUNwQjtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUVBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQTtBQUFBO0FBQUEsSUFHQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUVBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNBO0FBQ0EiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbImNvbmZpZy5tdHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRG1ub0Jhc2VUeXBlcywgY2FjaGVGdW5jdGlvblJlc3VsdCwgY3JlYXRlRG1ub0RhdGFUeXBlLCBkZWZpbmVEbW5vU2VydmljZSwgc3dpdGNoQnkgfSBmcm9tICdkbW5vJztcbmltcG9ydCB7IE9uZVBhc3N3b3JkRG1ub1BsdWdpbiB9IGZyb20gJ0BkbW5vLzFwYXNzd29yZC1wbHVnaW4nO1xuXG5jb25zdCBPbmVQYXNzQmFja2VuZCA9IE9uZVBhc3N3b3JkRG1ub1BsdWdpbi5pbmplY3RJbnN0YW5jZSgnMXBhc3MnKTtcblxuY29uc3QgY3VzdG9tVXJsVHlwZSA9IGNyZWF0ZURtbm9EYXRhVHlwZTx7IG5ld1NldHRpbmc6IGJvb2xlYW4gfT4oe1xuICB0eXBlTGFiZWw6ICdteS1jdXN0b20tdXJsJyxcbiAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy51cmwoe1xuICAgIHByZXBlbmRQcm90b2NvbDogdHJ1ZSxcbiAgICBub3JtYWxpemU6IHRydWUsXG4gIH0pLFxuICBzdW1tYXJ5OiAnc3VtbWFyeSBmcm9tIGN1c3RvbSB0eXBlJyxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVEbW5vU2VydmljZSh7XG4gIG5hbWU6ICd3ZWInLFxuICBwYXJlbnQ6ICdncm91cDEnLFxuICBpY29uOiAnZmlsZS1pY29uczp2aXRlJyxcbiAgc2V0dGluZ3M6IHtcbiAgICBkeW5hbWljQ29uZmlnOiAnb25seV9zdGF0aWMnLFxuICB9LFxuICBwaWNrOiBbXG4gICAgJ05PREVfRU5WJyxcbiAgICAnRE1OT19FTlYnLFxuICAgIC8vICdHT09HTEVfQU5BTFlUSUNTX01FQVNVUkVNRU5UX0lEJyxcbiAgICB7XG4gICAgICBzb3VyY2U6ICdhcGknLFxuICAgICAga2V5OiAnQVBJX1VSTCcsXG4gICAgICByZW5hbWVLZXk6ICdWSVRFX0FQSV9VUkwnLFxuICAgIH0sXG4gICAge1xuICAgICAgc291cmNlOiAnZ3JvdXAxJyxcbiAgICAgIC8vIHBpY2tpbmcgdGhlIHJlbmFtZWQga2V5IGZyb20gZ3JvdXAxXG4gICAgICBrZXk6ICdQSUNLX1RFU1RfRzEnLFxuICAgICAgcmVuYW1lS2V5OiAnUElDS19URVNUX1cnLFxuICAgICAgLy8gc2hvdWxkIGFwcGx5IF9hZnRlcl8gdGhlIGdyb3VwMSB0cmFuc2Zvcm1cbiAgICAgIHRyYW5zZm9ybVZhbHVlOiAodmFsKSA9PiBgJHt2YWx9LXdlYnRyYW5zZm9ybWAsXG4gICAgfVxuICBdLFxuICBzY2hlbWE6IHtcbiAgICAvLyBPUF9JVEVNXzE6IHtcbiAgICAvLyAgIHNlbnNpdGl2ZTogdHJ1ZSxcbiAgICAvLyAgIHZhbHVlOiBPbmVQYXNzQmFja2VuZC5pdGVtKCksXG4gICAgLy8gfSxcblxuICAgIC8vIEVYMToge1xuICAgIC8vICAgdmFsdWU6ICgpID0+IERNTk9fQ09ORklHLkJPT0xFQU5fRVhBTVBMRSxcbiAgICAvLyB9LFxuXG4gICAgRU5VTV9FWEFNUExFOiB7XG4gIFxuICAgICAgdWk6IHtcbiAgICAgICAgaWNvbjogJ2JpOmFwcGxlJyxcbiAgICAgICAgY29sb3I6ICdGRjAwMDAnXG4gICAgICB9LFxuICAgICAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5lbnVtKFtcbiAgICAgICAgeyBkZXNjcmlwdGlvbjogJ2RYJywgdmFsdWU6ICdiZWZvcmUnfSxcbiAgICAgICAgeyBkZXNjcmlwdGlvbjogJ2RYJywgdmFsdWU6ICdhZnRlcid9LFxuICAgICAgICB7IGRlc2NyaXB0aW9uOiAnZFgnLCB2YWx1ZTogZmFsc2V9LFxuICAgICAgXSksXG4gICAgfSxcblxuICAgIFZJVEVfU1RBVElDX1ZBTF9TVFI6IHtcbiAgICAgIHN1bW1hcnk6ICdjb29sIG5lYXQgdGhpbmcnLFxuICAgICAgc2Vuc2l0aXZlOiB0cnVlLFxuICAgICAgLy8gZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5zdHJpbmcoeyBzdGFydHNXaXRoOiAnZm9vXycgfSksXG4gICAgICBkZXNjcmlwdGlvbjogJ2xvbmdlciB0ZXh0IGFib3V0IHdoYXQgdGhpcyBzdXBlciBjb29sIHRoaW5nIGlzIGZvciEnLFxuICAgICAgdmFsdWU6ICdzdGF0aWMnLFxuICAgICAgZXh0ZXJuYWxEb2NzOiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnZXhwbGFuYXRpb24gZnJvbSBwcmlzbWEgZG9jcycsXG4gICAgICAgIHVybDogJ2h0dHBzOi8vd3d3LnByaXNtYS5pby9kYXRhZ3VpZGUvcG9zdGdyZXNxbC9zaG9ydC1ndWlkZXMvY29ubmVjdGlvbi11cmlzI2EtcXVpY2stb3ZlcnZpZXcnXG4gICAgICB9LFxuICAgICAgdWk6IHtcbiAgICAgICAgLy8gdXNlcyBpY29uaWZ5IG5hbWVzLCBzZWUgaHR0cHM6Ly9pY29uZXMuanMub3JnIGZvciBvcHRpb25zXG4gICAgICAgIGljb246ICdha2FyLWljb25zOnBvc3RncmVzcWwtZmlsbCcsXG4gICAgICAgIGNvbG9yOiAnMzM2NzkxJywgLy8gcG9zdGdyZXMgYnJhbmQgY29sb3IgOilcbiAgICAgIH0sXG4gICAgfSxcbiAgICBTV0lUQ0hfRVhBTVBMRToge1xuICAgICAgdmFsdWU6IHN3aXRjaEJ5KCdOT0RFX0VOVicsIHtcbiAgICAgICAgX2RlZmF1bHQ6ICdkZWZhdWx0LXZhbCcsXG4gICAgICAgIHN0YWdpbmc6ICdzdGFnaW5nLXZhbHVlJyxcbiAgICAgICAgcHJvZHVjdGlvbjogKCkgPT4gYHByb2QtJHtETU5PX0NPTkZJRy5OT0RFX0VOVn1gLFxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgQk9PTEVBTl9FWEFNUExFOiB7XG4gICAgICBkZXNjcmlwdGlvbjogJ3RoaXMgaXMgYSByZXF1aXJlZCBib29sZWFuIGNvbmZpZyBpdGVtJyxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgdmFsdWU6IGZhbHNlLFxuICAgIH0sXG4gICAgQk9PTEVBTl9PUFBPU0lURToge1xuICAgICAgZXh0ZW5kczogJ2Jvb2xlYW4nLFxuICAgICAgdmFsdWU6ICgpID0+ICFETU5PX0NPTkZJRy5CT09MRUFOX0VYQU1QTEUsXG4gICAgfSxcblxuICAgIFNJTVBMRV9PQkpFQ1Q6IHtcbiAgICAgIGV4dGVuZHM6ICdzaW1wbGVPYmplY3QnLFxuICAgICAgdmFsdWU6IHsgZm9vOiAxLCBiYXI6ICdiaXonIH0sXG4gICAgfSxcblxuICAgIFJBTkRPTV9OVU06IHtcbiAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMubnVtYmVyLFxuICAgICAgZGVzY3JpcHRpb246ICdyYW5kb20gbnVtYmVyIHRoYXQgd2lsbCBjaGFuZ2UgZWFjaCB0aW1lIGNvbmZpZyByZXNvbHV0aW9uIHJ1bnMnLFxuICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICB2YWx1ZTogKCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwKSxcbiAgICB9LFxuICAgIENBQ0hFRF9SQU5ET01fTlVNOiB7XG4gICAgICBleHRlbmRzOiBEbW5vQmFzZVR5cGVzLm51bWJlcixcbiAgICAgIGRlc2NyaXB0aW9uOiAncmFuZG9tIG51bWJlciB0aGF0IGlzIGNhY2hlZCwgc28gc2hvdWxkIHN0YXkgY29uc3RhbnQgdW50aWwgY2FjaGUgaXMgY2xlYXJlZCcsXG4gICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgIHZhbHVlOiBjYWNoZUZ1bmN0aW9uUmVzdWx0KCgpID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMCkpLFxuICAgIH0sXG4gICAgVklURV9TVEFUSUNfVkFMX05VTToge1xuICAgICAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5udW1iZXIoe1xuICAgICAgICBwcmVjaXNpb246IDEsXG4gICAgICAgIG1heDogMTAwLFxuICAgICAgICBtaW46IDFcbiAgICAgIH0pLFxuICAgICAgdmFsdWU6ICcxMi40NScsXG4gICAgfSxcbiAgICBXRUJfVVJMOiB7XG4gICAgICBleHRlbmRzOiBjdXN0b21VcmxUeXBlKHsgbmV3U2V0dGluZzogdHJ1ZSB9KSxcbiAgICAgIGRlc2NyaXB0aW9uOiAncHVibGljIHVybCBvZiB0aGlzIHdlYiBhcHAnLFxuICAgICAgZXhwb3NlOiB0cnVlLFxuICAgICAgLy8gcmVxdWlyZWQ6IHRydWUsXG4gICAgICAvLyB2YWx1ZTogJ0VYQU1QTEUnLFxuICAgIH0sXG4gICAgQU5PVEhFUjoge1xuICAgICAgdmFsdWU6IDEyM1xuICAgIH0sXG5cbiAgICBQVUJMSUNfU1RBVElDOiB7XG4gICAgICB2YWx1ZTogJ3BzLWluaXQnLFxuICAgIH0sXG4gICAgUFVCTElDX0RZTkFNSUM6IHtcbiAgICAgIGR5bmFtaWM6IHRydWUsXG4gICAgICB2YWx1ZTogJ3BkLWluaXQnLFxuICAgIH0sXG5cbiAgICBTRUNSRVRfU1RBVElDOiB7XG4gICAgICBzZW5zaXRpdmU6IHRydWUsXG4gICAgICB2YWx1ZTogJ3NzLWluaXQnLFxuICAgIH0sXG4gICAgU0VDUkVUX0RZTkFNSUM6IHtcbiAgICAgIHNlbnNpdGl2ZTogdHJ1ZSxcbiAgICAgIGR5bmFtaWM6IHRydWUsXG4gICAgICB2YWx1ZTogJ3NkLWluaXQnLFxuICAgIH1cbiAgfSxcbn0pXG4iXSwiZmlsZSI6Ii9Vc2Vycy90aGVvL2Rtbm8vZG1uby1yZWFjdGl2aXR5L2V4YW1wbGUtcmVwby9wYWNrYWdlcy93ZWJhcHAvLmRtbm8vY29uZmlnLm10cyJ9
