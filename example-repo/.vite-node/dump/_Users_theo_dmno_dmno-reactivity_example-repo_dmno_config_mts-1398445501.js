// /Users/theo/dmno/dmno-reactivity/example-repo/.dmno/config.mts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["getResolverCtx"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["DmnoBaseTypes","defineDmnoService","NodeEnvType","switchBy","inject"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/@fs/Users/theo/dmno/dmno-reactivity/packages/plugins/1password/dist/index.js", {"importedNames":["OnePasswordDmnoPlugin","OnePasswordTypes"]});
const __vite_ssr_import_3__ = await __vite_ssr_import__("/@fs/Users/theo/dmno/dmno-reactivity/packages/plugins/encrypted-vault/dist/index.js", {"importedNames":["EncryptedVaultDmnoPlugin","EncryptedVaultTypes"]});




const OnePassSecretsProd = new __vite_ssr_import_2__.OnePasswordDmnoPlugin("1pass/prod", {
  token: __vite_ssr_import_1__.inject(),
  envItemLink: "https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=n4wmgfq77mydg5lebtroa3ykvm&h=dmnoinc.1password.com",
  fallbackToCliBasedAuth: true
});
const OnePassSecretsDev = new __vite_ssr_import_2__.OnePasswordDmnoPlugin("1pass", {
  token: __vite_ssr_import_1__.inject(),
  envItemLink: "https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=4u4klfhpldobgdxrcjwb2bqsta&h=dmnoinc.1password.com",
  fallbackToCliBasedAuth: true
  // token: InjectPluginInputByType,
  // token: 'asdf',
});
const EncryptedVaultSecrets = new __vite_ssr_import_3__.EncryptedVaultDmnoPlugin("vault/prod", { name: "prod", key: __vite_ssr_import_1__.inject() });
__vite_ssr_exports__.default = __vite_ssr_import_1__.defineDmnoService({
  name: "root",
  isRoot: true,
  settings: {
    interceptSensitiveLeakRequests: true,
    redactSensitiveLogs: true,
    preventClientLeaks: true
  },
  schema: {
    NODE_ENV: __vite_ssr_import_1__.NodeEnvType,
    DMNO_ENV: {
      typeDescription: "standardized environment flag set by DMNO",
      value: (ctx) => ctx.get("NODE_ENV")
    },
    OP_TOKEN: {
      extends: __vite_ssr_import_2__.OnePasswordTypes.serviceAccountToken
    },
    // OP_TOKEN_PROD: {
    //   extends: OnePasswordTypes.serviceAccountToken,
    // },
    OP_ITEM_1: {
      value: __vite_ssr_import_1__.switchBy("DMNO_ENV", {
        _default: OnePassSecretsDev.item(),
        production: OnePassSecretsProd.item()
      })
    },
    OP_ITEM_BY_ID: {
      value: OnePassSecretsDev.itemById("ut2dftalm3ugmxc6klavms6tfq", "bphvvrqjegfmd5yoz4buw2aequ", "username")
    },
    OP_ITEM_BY_LINK: {
      value: OnePassSecretsDev.itemByLink("https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=bphvvrqjegfmd5yoz4buw2aequ&h=dmnoinc.1password.com", "helturjryuy73yjbnaovlce5fu")
    },
    OP_ITEM_BY_REFERENCE: {
      value: OnePassSecretsDev.itemByReference("op://dev test/example/username")
    },
    SOME_API_KEY: {
      value: __vite_ssr_import_1__.switchBy("DMNO_ENV", {
        _default: OnePassSecretsDev.item(),
        production: OnePassSecretsProd.item()
      })
    },
    DMNO_VAULT_KEY: {
      extends: __vite_ssr_import_3__.EncryptedVaultTypes.encryptionKey
      // required: true
    },
    ROOT_ONLY: {
      value: "rootonly"
    },
    CONTEXT: { value: "branch-preview" },
    VAULT_ITEM_1: {
      value: EncryptedVaultSecrets.item()
    },
    VAULT_ITEM_WITH_SWITCH: {
      value: __vite_ssr_import_1__.switchBy("NODE_ENV", {
        _default: EncryptedVaultSecrets.item(),
        staging: __vite_ssr_import_1__.switchBy("CONTEXT", {
          _default: void 0,
          "branch-preview": EncryptedVaultSecrets.item(),
          "pr-preview": EncryptedVaultSecrets.item()
        }),
        production: EncryptedVaultSecrets.item()
      })
    },
    PICK_TEST: {
      value: () => `pick-test--${__vite_ssr_import_0__.getResolverCtx().get("ROOT_ONLY")}`
    },
    CONTACT_EMAIL: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.email({
        normalize: true
      }),
      value: "Test@test.com"
    },
    SOME_IPV4: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.ipAddress,
      required: true,
      value: "100.200.1.1"
    },
    SOME_IPV6: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.ipAddress({
        version: 6,
        normalize: true
      }),
      required: true,
      value: "2001:0DB8:85a3:0000:0000:8a2e:0370:7334"
    },
    SOME_PORT: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.port,
      required: true,
      value: "8080"
    },
    SOME_SEMVER: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.semver({
        normalize: true
      }),
      required: true,
      value: "1.2.3-ALPHA.1"
    },
    SOME_DATE: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.isoDate,
      required: true,
      value: (/* @__PURE__ */ new Date()).toISOString()
    },
    SOME_UUID: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.uuid,
      required: true,
      value: "550e8400-e29b-41d4-a716-446655440000"
    },
    SOME_MD5: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.md5,
      required: true,
      value: "d41d8cd98f00b204e9800998ecf8427e"
    }
  }
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFJQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUNBO0FBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQTtBQUFBO0FBR0E7QUFHQTtBQU1BO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBS0E7QUFBQSxNQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUE7QUFBQSxJQUVBO0FBQUEsSUFHQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0EsMkJBQWlDLHVEQUFxQjtBQUFBLElBQ3REO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxRQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUVBO0FBQUEsTUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxRQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUVBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0E7QUFDQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiY29uZmlnLm10cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEbW5vQmFzZVR5cGVzLCBkZWZpbmVEbW5vU2VydmljZSwgY29uZmlnUGF0aCwgTm9kZUVudlR5cGUsIHN3aXRjaEJ5LCBpbmplY3QgfSBmcm9tICdkbW5vJztcbmltcG9ydCB7IE9uZVBhc3N3b3JkRG1ub1BsdWdpbiwgT25lUGFzc3dvcmRUeXBlcyB9IGZyb20gJ0BkbW5vLzFwYXNzd29yZC1wbHVnaW4nO1xuaW1wb3J0IHsgRW5jcnlwdGVkVmF1bHREbW5vUGx1Z2luLCBFbmNyeXB0ZWRWYXVsdFR5cGVzIH0gZnJvbSAnQGRtbm8vZW5jcnlwdGVkLXZhdWx0LXBsdWdpbic7XG5cblxuXG5jb25zdCBPbmVQYXNzU2VjcmV0c1Byb2QgPSBuZXcgT25lUGFzc3dvcmREbW5vUGx1Z2luKCcxcGFzcy9wcm9kJywge1xuICB0b2tlbjogaW5qZWN0KCksXG4gIGVudkl0ZW1MaW5rOiAnaHR0cHM6Ly9zdGFydC4xcGFzc3dvcmQuY29tL29wZW4vaT9hPUkzR1VBMktVNkJEM0ZCSEE0N1FOQklWRVY0JnY9dXQyZGZ0YWxtM3VnbXhjNmtsYXZtczZ0ZnEmaT1uNHdtZ2ZxNzdteWRnNWxlYnRyb2EzeWt2bSZoPWRtbm9pbmMuMXBhc3N3b3JkLmNvbScsXG4gIGZhbGxiYWNrVG9DbGlCYXNlZEF1dGg6IHRydWUsXG59KTtcbmNvbnN0IE9uZVBhc3NTZWNyZXRzRGV2ID0gbmV3IE9uZVBhc3N3b3JkRG1ub1BsdWdpbignMXBhc3MnLCB7XG4gIHRva2VuOiBpbmplY3QoKSxcbiAgZW52SXRlbUxpbms6ICdodHRwczovL3N0YXJ0LjFwYXNzd29yZC5jb20vb3Blbi9pP2E9STNHVUEyS1U2QkQzRkJIQTQ3UU5CSVZFVjQmdj11dDJkZnRhbG0zdWdteGM2a2xhdm1zNnRmcSZpPTR1NGtsZmhwbGRvYmdkeHJjandiMmJxc3RhJmg9ZG1ub2luYy4xcGFzc3dvcmQuY29tJyxcbiAgZmFsbGJhY2tUb0NsaUJhc2VkQXV0aDogdHJ1ZSxcbiAgLy8gdG9rZW46IEluamVjdFBsdWdpbklucHV0QnlUeXBlLFxuICAvLyB0b2tlbjogJ2FzZGYnLFxufSk7XG5cblxuY29uc3QgRW5jcnlwdGVkVmF1bHRTZWNyZXRzID0gbmV3IEVuY3J5cHRlZFZhdWx0RG1ub1BsdWdpbigndmF1bHQvcHJvZCcsIHsgbmFtZTogJ3Byb2QnLCBrZXk6IGluamVjdCgpIH0pO1xuLy8gY29uc3QgTm9uUHJvZFZhdWx0ID0gbmV3IEVuY3J5cHRlZFZhdWx0RG1ub1BsdWdpbigndmF1bHQvZGV2Jywge1xuLy8gICBrZXk6IGNvbmZpZ1BhdGgoJ0RNTk9fVkFVTFRfS0VZJyksXG4vLyAgIG5hbWU6ICdkZXYnLFxuLy8gfSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZURtbm9TZXJ2aWNlKHtcbiAgbmFtZTogJ3Jvb3QnLFxuICBpc1Jvb3Q6IHRydWUsXG4gIHNldHRpbmdzOiB7XG4gICAgaW50ZXJjZXB0U2Vuc2l0aXZlTGVha1JlcXVlc3RzOiB0cnVlLFxuICAgIHJlZGFjdFNlbnNpdGl2ZUxvZ3M6IHRydWUsXG4gICAgcHJldmVudENsaWVudExlYWtzOiB0cnVlLFxuICB9LFxuICBzY2hlbWE6IHtcbiAgICBOT0RFX0VOVjogTm9kZUVudlR5cGUsXG4gICAgRE1OT19FTlY6IHtcbiAgICAgIHR5cGVEZXNjcmlwdGlvbjogJ3N0YW5kYXJkaXplZCBlbnZpcm9ubWVudCBmbGFnIHNldCBieSBETU5PJyxcbiAgICAgIHZhbHVlOiAoY3R4KSA9PiBjdHguZ2V0KCdOT0RFX0VOVicpLFxuICAgIH0sXG5cbiAgICBPUF9UT0tFTjoge1xuICAgICAgZXh0ZW5kczogT25lUGFzc3dvcmRUeXBlcy5zZXJ2aWNlQWNjb3VudFRva2VuLFxuICAgIH0sXG4gICAgLy8gT1BfVE9LRU5fUFJPRDoge1xuICAgIC8vICAgZXh0ZW5kczogT25lUGFzc3dvcmRUeXBlcy5zZXJ2aWNlQWNjb3VudFRva2VuLFxuICAgIC8vIH0sXG5cbiAgICBPUF9JVEVNXzE6IHtcbiAgICAgIHZhbHVlOiBzd2l0Y2hCeSgnRE1OT19FTlYnLCB7XG4gICAgICAgIF9kZWZhdWx0OiBPbmVQYXNzU2VjcmV0c0Rldi5pdGVtKCksXG4gICAgICAgIHByb2R1Y3Rpb246IE9uZVBhc3NTZWNyZXRzUHJvZC5pdGVtKCksXG4gICAgICB9KSxcbiAgICB9LFxuICAgIE9QX0lURU1fQllfSUQ6IHtcbiAgICAgIHZhbHVlOiBPbmVQYXNzU2VjcmV0c0Rldi5pdGVtQnlJZChcInV0MmRmdGFsbTN1Z214YzZrbGF2bXM2dGZxXCIsIFwiYnBodnZycWplZ2ZtZDV5b3o0YnV3MmFlcXVcIiwgXCJ1c2VybmFtZVwiKSxcbiAgICB9LFxuICAgIE9QX0lURU1fQllfTElOSzoge1xuICAgICAgdmFsdWU6IE9uZVBhc3NTZWNyZXRzRGV2Lml0ZW1CeUxpbmsoXCJodHRwczovL3N0YXJ0LjFwYXNzd29yZC5jb20vb3Blbi9pP2E9STNHVUEyS1U2QkQzRkJIQTQ3UU5CSVZFVjQmdj11dDJkZnRhbG0zdWdteGM2a2xhdm1zNnRmcSZpPWJwaHZ2cnFqZWdmbWQ1eW96NGJ1dzJhZXF1Jmg9ZG1ub2luYy4xcGFzc3dvcmQuY29tXCIsIFwiaGVsdHVyanJ5dXk3M3lqYm5hb3ZsY2U1ZnVcIiksXG4gICAgfSxcbiAgICBPUF9JVEVNX0JZX1JFRkVSRU5DRToge1xuICAgICAgdmFsdWU6IE9uZVBhc3NTZWNyZXRzRGV2Lml0ZW1CeVJlZmVyZW5jZShcIm9wOi8vZGV2IHRlc3QvZXhhbXBsZS91c2VybmFtZVwiKSxcbiAgICB9LFxuXG4gICAgU09NRV9BUElfS0VZOiB7XG4gICAgICB2YWx1ZTogc3dpdGNoQnkoJ0RNTk9fRU5WJywge1xuICAgICAgICBfZGVmYXVsdDogT25lUGFzc1NlY3JldHNEZXYuaXRlbSgpLFxuICAgICAgICBwcm9kdWN0aW9uOiBPbmVQYXNzU2VjcmV0c1Byb2QuaXRlbSgpLFxuICAgICAgfSksXG4gICAgfSxcblxuICAgIERNTk9fVkFVTFRfS0VZOiB7XG4gICAgICBleHRlbmRzOiBFbmNyeXB0ZWRWYXVsdFR5cGVzLmVuY3J5cHRpb25LZXksXG4gICAgICAvLyByZXF1aXJlZDogdHJ1ZVxuICAgIH0sXG5cbiAgICBcbiAgICBST09UX09OTFk6IHtcbiAgICAgIHZhbHVlOiAncm9vdG9ubHknLFxuICAgIH0sXG5cbiAgICBDT05URVhUOiB7IHZhbHVlOiAnYnJhbmNoLXByZXZpZXcnIH0sXG5cbiAgICBWQVVMVF9JVEVNXzE6IHtcbiAgICAgIHZhbHVlOiBFbmNyeXB0ZWRWYXVsdFNlY3JldHMuaXRlbSgpLFxuICAgIH0sXG4gICAgVkFVTFRfSVRFTV9XSVRIX1NXSVRDSDoge1xuICAgICAgdmFsdWU6IHN3aXRjaEJ5KCdOT0RFX0VOVicsIHtcbiAgICAgICAgX2RlZmF1bHQ6IEVuY3J5cHRlZFZhdWx0U2VjcmV0cy5pdGVtKCksXG4gICAgICAgIHN0YWdpbmc6IHN3aXRjaEJ5KCdDT05URVhUJywge1xuICAgICAgICAgIF9kZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgJ2JyYW5jaC1wcmV2aWV3JzogRW5jcnlwdGVkVmF1bHRTZWNyZXRzLml0ZW0oKSxcbiAgICAgICAgICAncHItcHJldmlldyc6IEVuY3J5cHRlZFZhdWx0U2VjcmV0cy5pdGVtKCksXG4gICAgICAgIH0pLFxuICAgICAgICBwcm9kdWN0aW9uOiBFbmNyeXB0ZWRWYXVsdFNlY3JldHMuaXRlbSgpXG4gICAgICB9KSxcbiAgICB9LFxuXG4gICAgUElDS19URVNUOiB7XG4gICAgICB2YWx1ZTogKCkgPT4gYHBpY2stdGVzdC0tJHtETU5PX0NPTkZJRy5ST09UX09OTFl9YCxcbiAgICB9LFxuXG4gICAgQ09OVEFDVF9FTUFJTDoge1xuICAgICAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5lbWFpbCh7XG4gICAgICAgIG5vcm1hbGl6ZTogdHJ1ZSxcbiAgICAgIH0pLFxuICAgICAgdmFsdWU6ICdUZXN0QHRlc3QuY29tJ1xuICAgIH0sXG5cbiAgICBTT01FX0lQVjQ6IHtcbiAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMuaXBBZGRyZXNzLFxuICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICB2YWx1ZTogJzEwMC4yMDAuMS4xJ1xuICAgIH0sXG5cbiAgICBTT01FX0lQVjY6IHtcbiAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMuaXBBZGRyZXNzKHtcbiAgICAgICAgdmVyc2lvbjogNixcbiAgICAgICAgbm9ybWFsaXplOiB0cnVlLFxuICAgICAgfSksXG4gICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgIHZhbHVlOiAnMjAwMTowREI4Ojg1YTM6MDAwMDowMDAwOjhhMmU6MDM3MDo3MzM0J1xuICAgIH0sXG5cbiAgICBTT01FX1BPUlQ6IHtcbiAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMucG9ydCxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgdmFsdWU6ICc4MDgwJ1xuICAgIH0sXG5cbiAgICBTT01FX1NFTVZFUjoge1xuICAgICAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5zZW12ZXIoe1xuICAgICAgICBub3JtYWxpemU6IHRydWUsXG4gICAgICB9KSxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgdmFsdWU6ICcxLjIuMy1BTFBIQS4xJ1xuICAgIH0sXG5cbiAgICBTT01FX0RBVEU6IHtcbiAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMuaXNvRGF0ZSxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgdmFsdWU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgIH0sXG5cbiAgICBTT01FX1VVSUQ6IHtcbiAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMudXVpZCxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgdmFsdWU6ICc1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAnXG4gICAgfSxcblxuICAgIFNPTUVfTUQ1OiB7XG4gICAgICBleHRlbmRzOiBEbW5vQmFzZVR5cGVzLm1kNSxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgdmFsdWU6ICdkNDFkOGNkOThmMDBiMjA0ZTk4MDA5OThlY2Y4NDI3ZSdcbiAgICB9LFxuICB9XG59KTtcblxuIl0sImZpbGUiOiIvVXNlcnMvdGhlby9kbW5vL2Rtbm8tcmVhY3Rpdml0eS9leGFtcGxlLXJlcG8vLmRtbm8vY29uZmlnLm10cyJ9
