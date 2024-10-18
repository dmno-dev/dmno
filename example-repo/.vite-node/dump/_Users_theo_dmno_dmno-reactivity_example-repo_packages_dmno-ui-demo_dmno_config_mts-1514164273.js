// /Users/theo/dmno/dmno-reactivity/example-repo/packages/dmno-ui-demo/.dmno/config.mts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["getResolverCtx"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["DmnoBaseTypes","defineDmnoService","switchBy"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/@fs/Users/theo/dmno/dmno-reactivity/packages/plugins/1password/dist/index.js", {"importedNames":["OnePasswordDmnoPlugin"]});



const OnePassSecrets = __vite_ssr_import_2__.OnePasswordDmnoPlugin.injectInstance("1pass");
throw new Error("bloop");
__vite_ssr_exports__.default = __vite_ssr_import_1__.defineDmnoService({
  // name: 'dmno-ui-demo',
  settings: {
    interceptSensitiveLeakRequests: true,
    redactSensitiveLogs: true,
    preventClientLeaks: true
  },
  pick: [
    "NODE_ENV"
  ],
  schema: {
    NORMAL_NUMBER: {
      value: 123,
      required: true
    },
    FN_RESOLVER: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.number,
      summary: "example of a function resolver",
      value: () => __vite_ssr_import_0__.getResolverCtx().get("NORMAL_NUMBER") + 456
    },
    SENSITIVE_EXAMPLE: {
      value: OnePassSecrets.itemByReference("op://dev test/example/username"),
      sensitive: true
    },
    EXTRA_SUPER_LONG_NAME_EXAMPLE_FOO_BAR_BIZ_BAZ_BUZ_BING_BONG_BOOP: {
      summary: "example showing a super long name that should be truncated but still show the icons",
      value: "asldkjfhqoiuweyrklajsdhnxbcvmnsdjkhfhqiwuerqolejfhzsjmnvbxjkhfsiudyfrwjkebfmnsdbfkjsdhfiukjwehrkjsdbnfkjbsdkjfbxcmnbvjksdhgfkjweiuryweijkhkjsdbfmnxdbcvkjsdhfjkiweyrkiujhsdjkf"
    },
    BRANCH_EXAMPLE: {
      value: __vite_ssr_import_1__.switchBy("NODE_ENV", {
        _default: "default-val",
        staging: "staging-val",
        production: "production-val"
      })
    },
    OBJECT_EXAMPLE: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.object({
        child1: { value: "child-1-val" },
        child2: { value: "child-2-val" },
        objChild: {
          // required: true,
          extends: __vite_ssr_import_1__.DmnoBaseTypes.object({
            gchild1: { value: "grandchild!" }
            // gchild2: { value: 'another' },
          })
        }
      })
    },
    // overrides
    FROM_DOTENV_OVERRIDE: {
      value: "default"
    },
    FROM_SHELL_OVERRIDE: {
      value: "default"
    },
    // errors
    REQUIRED_ERROR_EXAMPLE: {
      required: true
    },
    VALIDATION_ERROR_EXAMPLE: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.string({ startsWith: "abc", minLength: 8 }),
      value: "xyz123"
    },
    COERCION_ERROR_EXAMPLE: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.number(),
      value: "not-a-number"
    },
    SCHEMA_ERROR_EXAMPLE: {
      // value: configPath('bad-entity-id', 'bad-path'),
    },
    RESOLUTION_ERROR_EXAMPLE: {
      value: OnePassSecrets.itemByReference("badreference")
    }
    // RESOLVER_CRASH_EXAMPLE: {
    //   value: OnePassSecrets.itemByLink('badlink', 'asdf'),
    // }
  }
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7OztBQUNBO0FBQ0E7QUFJQTtBQUNBO0FBQ0E7QUFBQTtBQUFBLEVBRUE7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBLGFBQW1CLDhEQUF5QjtBQUFBLElBQzVDO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQTtBQUFBLFVBRUE7QUFBQSxZQUNBO0FBQUE7QUFBQSxVQUVBO0FBQUEsUUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUE7QUFBQSxJQUdBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQTtBQUFBLElBR0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBO0FBQUEsSUFFQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSUE7QUFDQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiY29uZmlnLm10cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7IERtbm9CYXNlVHlwZXMsIGRlZmluZURtbm9TZXJ2aWNlLCBjb25maWdQYXRoLCBOb2RlRW52VHlwZSwgc3dpdGNoQnksIGluamVjdCB9IGZyb20gJ2Rtbm8nO1xuaW1wb3J0IHsgT25lUGFzc3dvcmREbW5vUGx1Z2luLCBPbmVQYXNzd29yZFR5cGVzIH0gZnJvbSAnQGRtbm8vMXBhc3N3b3JkLXBsdWdpbic7XG5cblxuXG5jb25zdCBPbmVQYXNzU2VjcmV0cyA9IE9uZVBhc3N3b3JkRG1ub1BsdWdpbi5pbmplY3RJbnN0YW5jZSgnMXBhc3MnKTtcbnRocm93IG5ldyBFcnJvcignYmxvb3AnKTtcbmV4cG9ydCBkZWZhdWx0IGRlZmluZURtbm9TZXJ2aWNlKHtcbiAgLy8gbmFtZTogJ2Rtbm8tdWktZGVtbycsXG4gIHNldHRpbmdzOiB7XG4gICAgaW50ZXJjZXB0U2Vuc2l0aXZlTGVha1JlcXVlc3RzOiB0cnVlLFxuICAgIHJlZGFjdFNlbnNpdGl2ZUxvZ3M6IHRydWUsXG4gICAgcHJldmVudENsaWVudExlYWtzOiB0cnVlLFxuICB9LFxuICBwaWNrOiBbXG4gICAgJ05PREVfRU5WJ1xuICBdLFxuICBzY2hlbWE6IHtcbiAgICBOT1JNQUxfTlVNQkVSOiB7XG4gICAgICB2YWx1ZTogMTIzLFxuICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgfSxcbiAgICBGTl9SRVNPTFZFUjoge1xuICAgICAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5udW1iZXIsXG4gICAgICBzdW1tYXJ5OiAnZXhhbXBsZSBvZiBhIGZ1bmN0aW9uIHJlc29sdmVyJyxcbiAgICAgIHZhbHVlOiAoKSA9PiBETU5PX0NPTkZJRy5OT1JNQUxfTlVNQkVSICsgNDU2LFxuICAgIH0sXG4gICAgU0VOU0lUSVZFX0VYQU1QTEU6IHtcbiAgICAgIHZhbHVlOiBPbmVQYXNzU2VjcmV0cy5pdGVtQnlSZWZlcmVuY2UoXCJvcDovL2RldiB0ZXN0L2V4YW1wbGUvdXNlcm5hbWVcIiksXG4gICAgICBzZW5zaXRpdmU6IHRydWUsXG4gICAgfSxcbiAgICBFWFRSQV9TVVBFUl9MT05HX05BTUVfRVhBTVBMRV9GT09fQkFSX0JJWl9CQVpfQlVaX0JJTkdfQk9OR19CT09QOiB7XG4gICAgICBzdW1tYXJ5OiAnZXhhbXBsZSBzaG93aW5nIGEgc3VwZXIgbG9uZyBuYW1lIHRoYXQgc2hvdWxkIGJlIHRydW5jYXRlZCBidXQgc3RpbGwgc2hvdyB0aGUgaWNvbnMnLFxuICAgICAgdmFsdWU6ICdhc2xka2pmaHFvaXV3ZXlya2xhanNkaG54YmN2bW5zZGpraGZocWl3dWVycW9sZWpmaHpzam1udmJ4amtoZnNpdWR5ZnJ3amtlYmZtbnNkYmZranNkaGZpdWtqd2Vocmtqc2RibmZramJzZGtqZmJ4Y21uYnZqa3NkaGdma2p3ZWl1cnl3ZWlqa2hranNkYmZtbnhkYmN2a2pzZGhmamtpd2V5cmtpdWpoc2Rqa2YnXG4gICAgfSxcbiAgICBCUkFOQ0hfRVhBTVBMRToge1xuICAgICAgdmFsdWU6IHN3aXRjaEJ5KCdOT0RFX0VOVicsIHtcbiAgICAgICAgX2RlZmF1bHQ6ICdkZWZhdWx0LXZhbCcsXG4gICAgICAgIHN0YWdpbmc6ICdzdGFnaW5nLXZhbCcsXG4gICAgICAgIHByb2R1Y3Rpb246ICdwcm9kdWN0aW9uLXZhbCcsXG4gICAgICB9KVxuICAgIH0sXG4gICAgT0JKRUNUX0VYQU1QTEU6IHtcbiAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMub2JqZWN0KHtcbiAgICAgICAgY2hpbGQxOiB7IHZhbHVlOiAnY2hpbGQtMS12YWwnIH0sXG4gICAgICAgIGNoaWxkMjogeyB2YWx1ZTogJ2NoaWxkLTItdmFsJyB9LFxuICAgICAgICBvYmpDaGlsZDoge1xuICAgICAgICAgIC8vIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMub2JqZWN0KHtcbiAgICAgICAgICAgIGdjaGlsZDE6IHsgdmFsdWU6ICdncmFuZGNoaWxkIScgfSxcbiAgICAgICAgICAgIC8vIGdjaGlsZDI6IHsgdmFsdWU6ICdhbm90aGVyJyB9LFxuICAgICAgICAgIH0pLFxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvLyBvdmVycmlkZXNcbiAgICBGUk9NX0RPVEVOVl9PVkVSUklERToge1xuICAgICAgdmFsdWU6ICdkZWZhdWx0JyxcbiAgICB9LFxuICAgIEZST01fU0hFTExfT1ZFUlJJREU6IHtcbiAgICAgIHZhbHVlOiAnZGVmYXVsdCcsXG4gICAgfSxcblxuICAgIC8vIGVycm9yc1xuICAgIFJFUVVJUkVEX0VSUk9SX0VYQU1QTEU6IHtcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIH0sXG4gICAgVkFMSURBVElPTl9FUlJPUl9FWEFNUExFOiB7XG4gICAgICBleHRlbmRzOiBEbW5vQmFzZVR5cGVzLnN0cmluZyh7IHN0YXJ0c1dpdGg6ICdhYmMnLCBtaW5MZW5ndGg6IDggfSksXG4gICAgICB2YWx1ZTogJ3h5ejEyMycsXG4gICAgfSxcbiAgICBDT0VSQ0lPTl9FUlJPUl9FWEFNUExFOiB7XG4gICAgICBleHRlbmRzOiBEbW5vQmFzZVR5cGVzLm51bWJlcigpLFxuICAgICAgdmFsdWU6ICdub3QtYS1udW1iZXInLFxuICAgIH0sXG4gICAgU0NIRU1BX0VSUk9SX0VYQU1QTEU6IHtcbiAgICAgIC8vIHZhbHVlOiBjb25maWdQYXRoKCdiYWQtZW50aXR5LWlkJywgJ2JhZC1wYXRoJyksXG4gICAgfSxcbiAgICBSRVNPTFVUSU9OX0VSUk9SX0VYQU1QTEU6IHtcbiAgICAgIHZhbHVlOiBPbmVQYXNzU2VjcmV0cy5pdGVtQnlSZWZlcmVuY2UoJ2JhZHJlZmVyZW5jZScpLFxuICAgIH0sXG4gICAgLy8gUkVTT0xWRVJfQ1JBU0hfRVhBTVBMRToge1xuICAgIC8vICAgdmFsdWU6IE9uZVBhc3NTZWNyZXRzLml0ZW1CeUxpbmsoJ2JhZGxpbmsnLCAnYXNkZicpLFxuICAgIC8vIH1cbiAgfVxufSk7XG5cbiJdLCJmaWxlIjoiL1VzZXJzL3RoZW8vZG1uby9kbW5vLXJlYWN0aXZpdHkvZXhhbXBsZS1yZXBvL3BhY2thZ2VzL2Rtbm8tdWktZGVtby8uZG1uby9jb25maWcubXRzIn0=
