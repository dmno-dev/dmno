// /Users/theo/dmno/dmno-reactivity/example-repo/packages/api/.dmno/config.mts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["getResolverCtx"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["defineDmnoService","DmnoBaseTypes","switchByNodeEnv"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/@fs/Users/theo/dmno/dmno-reactivity/packages/plugins/1password/dist/index.js", {"importedNames":["OnePasswordDmnoPlugin"]});
const __vite_ssr_import_3__ = await __vite_ssr_import__("/@fs/Users/theo/dmno/dmno-reactivity/packages/plugins/encrypted-vault/dist/index.js", {"importedNames":["EncryptedVaultDmnoPlugin"]});




const OnePassBackend = __vite_ssr_import_2__.OnePasswordDmnoPlugin.injectInstance("1pass");
const VaultPlugin = __vite_ssr_import_3__.EncryptedVaultDmnoPlugin.injectInstance("vault/prod");
__vite_ssr_exports__.default = __vite_ssr_import_1__.defineDmnoService({
  name: "api",
  parent: "group1",
  pick: [
    "NODE_ENV",
    "DMNO_ENV"
  ],
  schema: {
    OP_ITEM_1: {
      value: OnePassBackend.item()
    },
    PUBLIC_EXAMPLE: {
      value: "non sensitive"
    },
    SECRET_FOO: {
      value: "secret-foo-value",
      sensitive: {
        allowedDomains: ["*"]
      }
    },
    STRIPE_SECRET_KEY: {
      value: "fake-stripe-secret-key",
      required: true,
      sensitive: {
        allowedDomains: ["api.stripe.com"]
      }
    },
    ANOTHER_SECRET: {
      value: "xxxyyyyzzz",
      sensitive: {
        redactMode: "show_first_last"
      }
    },
    SECRET_EXAMPLE: {
      extends: __vite_ssr_import_1__.DmnoBaseTypes.string,
      required: true,
      value: OnePassBackend.itemByLink("https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&h=dmnoinc.1password.com&i=bphvvrqjegfmd5yoz4buw2aequ&v=ut2dftalm3ugmxc6klavms6tfq", "username"),
      sensitive: true
    },
    SWITCHED_EXAMPLE: {
      value: __vite_ssr_import_1__.switchByNodeEnv({
        _default: OnePassBackend.itemByReference("op://dev test/example/username"),
        staging: OnePassBackend.itemByReference("op://dev test/example/username"),
        production: OnePassBackend.itemByReference("op://dev test/example/username")
      })
    },
    API_ONLY: {
      value: "set via dmno"
      // value: VaultPlugin.item(),
    },
    BOOL_NUM_FLAG: {
      extends: "boolean"
    },
    A_NEW_ITEM: {
      value: "phil 1"
    },
    PORT: {
      description: "port number to listen on",
      extends: __vite_ssr_import_1__.DmnoBaseTypes.number({ max: 9999 }),
      required: true,
      value: 9e3
    },
    API_URL: {
      description: "public url of this service",
      extends: __vite_ssr_import_1__.DmnoBaseTypes.string({}),
      expose: true,
      value: __vite_ssr_import_1__.switchByNodeEnv({
        _default: () => `http://localhost:${__vite_ssr_import_0__.getResolverCtx().get("PORT")}`,
        // staging: valueCreatedDuringDeployment(),
        production: "https://api.dmnoexampleapp.com"
      })
    },
    DB_URL: {
      // intellisense demo
      summary: "Primary DB URL",
      required: true,
      description: "houses all of our users, products, and orders data",
      typeDescription: "Postgres connection url",
      externalDocs: {
        description: "explanation (from prisma docs)",
        url: "https://www.prisma.io/dataguide/postgresql/short-guides/connection-uris#a-quick-overview"
      },
      ui: {
        // uses iconify names, see https://icones.js.org for options
        icon: "akar-icons:postgresql-fill",
        color: "336791"
        // postgres brand color :)
      },
      sensitive: true,
      value: "postgres://localhost:5432/my-api-db"
    }
  }
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUVBO0FBQUEsTUFDQTtBQUFBO0FBQUEsSUFFQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBRUE7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsUUFDQSxvQ0FBNEMsa0RBQWdCO0FBQUE7QUFBQSxRQUU1RDtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUE7QUFBQSxRQUVBO0FBQUEsUUFDQTtBQUFBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0E7QUFDQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiY29uZmlnLm10cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkZWZpbmVEbW5vU2VydmljZSwgRG1ub0Jhc2VUeXBlcywgc3dpdGNoQnlOb2RlRW52IH0gZnJvbSAnZG1ubyc7XG5pbXBvcnQgeyBPbmVQYXNzd29yZERtbm9QbHVnaW4gfSBmcm9tICdAZG1uby8xcGFzc3dvcmQtcGx1Z2luJztcbmltcG9ydCB7IEVuY3J5cHRlZFZhdWx0RG1ub1BsdWdpbiB9IGZyb20gJ0BkbW5vL2VuY3J5cHRlZC12YXVsdC1wbHVnaW4nO1xuXG5jb25zdCBPbmVQYXNzQmFja2VuZCA9IE9uZVBhc3N3b3JkRG1ub1BsdWdpbi5pbmplY3RJbnN0YW5jZSgnMXBhc3MnKTtcbmNvbnN0IFZhdWx0UGx1Z2luID0gRW5jcnlwdGVkVmF1bHREbW5vUGx1Z2luLmluamVjdEluc3RhbmNlKCd2YXVsdC9wcm9kJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZURtbm9TZXJ2aWNlKHtcbiAgbmFtZTogJ2FwaScsXG4gIHBhcmVudDogJ2dyb3VwMScsXG4gIHBpY2s6IFtcbiAgICAnTk9ERV9FTlYnLFxuICAgICdETU5PX0VOVicsXG4gIF0sXG4gIHNjaGVtYToge1xuICAgIE9QX0lURU1fMToge1xuICAgICAgdmFsdWU6IE9uZVBhc3NCYWNrZW5kLml0ZW0oKSxcbiAgICB9LFxuXG4gICAgUFVCTElDX0VYQU1QTEU6IHtcbiAgICAgIHZhbHVlOiAnbm9uIHNlbnNpdGl2ZScsXG4gICAgfSxcblxuICAgIFNFQ1JFVF9GT086IHtcbiAgICAgIHZhbHVlOiAnc2VjcmV0LWZvby12YWx1ZScsXG4gICAgICBzZW5zaXRpdmU6IHtcbiAgICAgICAgYWxsb3dlZERvbWFpbnM6IFsnKiddXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICBTVFJJUEVfU0VDUkVUX0tFWToge1xuICAgICAgdmFsdWU6ICdmYWtlLXN0cmlwZS1zZWNyZXQta2V5JyxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgc2Vuc2l0aXZlOiB7XG4gICAgICAgIGFsbG93ZWREb21haW5zOiBbJ2FwaS5zdHJpcGUuY29tJ10sXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICBBTk9USEVSX1NFQ1JFVDoge1xuICAgICAgdmFsdWU6ICd4eHh5eXl5enp6JyxcbiAgICAgIHNlbnNpdGl2ZToge1xuICAgICAgICByZWRhY3RNb2RlOiAnc2hvd19maXJzdF9sYXN0J1xuICAgICAgfSxcbiAgICB9LFxuXG4gICAgU0VDUkVUX0VYQU1QTEU6IHtcbiAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMuc3RyaW5nLFxuICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICB2YWx1ZTogT25lUGFzc0JhY2tlbmQuaXRlbUJ5TGluayhcImh0dHBzOi8vc3RhcnQuMXBhc3N3b3JkLmNvbS9vcGVuL2k/YT1JM0dVQTJLVTZCRDNGQkhBNDdRTkJJVkVWNCZoPWRtbm9pbmMuMXBhc3N3b3JkLmNvbSZpPWJwaHZ2cnFqZWdmbWQ1eW96NGJ1dzJhZXF1JnY9dXQyZGZ0YWxtM3VnbXhjNmtsYXZtczZ0ZnFcIiwgJ3VzZXJuYW1lJyksXG4gICAgICBzZW5zaXRpdmU6IHRydWUsXG4gICAgfSxcbiAgICBTV0lUQ0hFRF9FWEFNUExFOiB7XG4gICAgICB2YWx1ZTogc3dpdGNoQnlOb2RlRW52KHtcbiAgICAgICAgX2RlZmF1bHQ6IE9uZVBhc3NCYWNrZW5kLml0ZW1CeVJlZmVyZW5jZShcIm9wOi8vZGV2IHRlc3QvZXhhbXBsZS91c2VybmFtZVwiKSxcbiAgICAgICAgc3RhZ2luZzogT25lUGFzc0JhY2tlbmQuaXRlbUJ5UmVmZXJlbmNlKFwib3A6Ly9kZXYgdGVzdC9leGFtcGxlL3VzZXJuYW1lXCIpLFxuICAgICAgICBwcm9kdWN0aW9uOiBPbmVQYXNzQmFja2VuZC5pdGVtQnlSZWZlcmVuY2UoXCJvcDovL2RldiB0ZXN0L2V4YW1wbGUvdXNlcm5hbWVcIiksXG4gICAgICB9KSxcbiAgICB9LFxuXG4gICAgQVBJX09OTFk6IHtcbiAgICAgIHZhbHVlOiAnc2V0IHZpYSBkbW5vJ1xuICAgICAgLy8gdmFsdWU6IFZhdWx0UGx1Z2luLml0ZW0oKSxcbiAgICB9LFxuXG4gICAgQk9PTF9OVU1fRkxBRzoge1xuICAgICAgZXh0ZW5kczogJ2Jvb2xlYW4nLFxuICAgIH0sXG5cbiAgICBBX05FV19JVEVNOiB7XG4gICAgICB2YWx1ZTogXCJwaGlsIDFcIlxuICAgIH0sIFxuICAgIFBPUlQ6IHtcbiAgICAgIGRlc2NyaXB0aW9uOiAncG9ydCBudW1iZXIgdG8gbGlzdGVuIG9uJyxcbiAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMubnVtYmVyKHsgbWF4OiA5OTk5IH0pLFxuICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICB2YWx1ZTogOTAwMCxcbiAgICB9LFxuICAgIEFQSV9VUkw6IHtcbiAgICAgIGRlc2NyaXB0aW9uOiAncHVibGljIHVybCBvZiB0aGlzIHNlcnZpY2UnLFxuICAgICAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5zdHJpbmcoe30pLFxuICAgICAgZXhwb3NlOiB0cnVlLFxuICAgICAgdmFsdWU6IHN3aXRjaEJ5Tm9kZUVudih7XG4gICAgICAgIF9kZWZhdWx0OiAoKSA9PiBgaHR0cDovL2xvY2FsaG9zdDoke0RNTk9fQ09ORklHLlBPUlR9YCxcbiAgICAgICAgLy8gc3RhZ2luZzogdmFsdWVDcmVhdGVkRHVyaW5nRGVwbG95bWVudCgpLFxuICAgICAgICBwcm9kdWN0aW9uOiAnaHR0cHM6Ly9hcGkuZG1ub2V4YW1wbGVhcHAuY29tJyxcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIERCX1VSTDogeyAvLyBpbnRlbGxpc2Vuc2UgZGVtb1xuICAgICAgc3VtbWFyeTogJ1ByaW1hcnkgREIgVVJMJyxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdob3VzZXMgYWxsIG9mIG91ciB1c2VycywgcHJvZHVjdHMsIGFuZCBvcmRlcnMgZGF0YScsXG4gICAgICB0eXBlRGVzY3JpcHRpb246ICdQb3N0Z3JlcyBjb25uZWN0aW9uIHVybCcsXG4gICAgICBleHRlcm5hbERvY3M6IHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdleHBsYW5hdGlvbiAoZnJvbSBwcmlzbWEgZG9jcyknLFxuICAgICAgICB1cmw6ICdodHRwczovL3d3dy5wcmlzbWEuaW8vZGF0YWd1aWRlL3Bvc3RncmVzcWwvc2hvcnQtZ3VpZGVzL2Nvbm5lY3Rpb24tdXJpcyNhLXF1aWNrLW92ZXJ2aWV3JyxcbiAgICAgIH0sXG4gICAgICB1aToge1xuICAgICAgICAvLyB1c2VzIGljb25pZnkgbmFtZXMsIHNlZSBodHRwczovL2ljb25lcy5qcy5vcmcgZm9yIG9wdGlvbnNcbiAgICAgICAgaWNvbjogJ2FrYXItaWNvbnM6cG9zdGdyZXNxbC1maWxsJyxcbiAgICAgICAgY29sb3I6ICczMzY3OTEnLCAvLyBwb3N0Z3JlcyBicmFuZCBjb2xvciA6KVxuICAgICAgfSxcbiAgICAgIHNlbnNpdGl2ZTogdHJ1ZSxcbiAgICAgIHZhbHVlOiAncG9zdGdyZXM6Ly9sb2NhbGhvc3Q6NTQzMi9teS1hcGktZGInXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sImZpbGUiOiIvVXNlcnMvdGhlby9kbW5vL2Rtbm8tcmVhY3Rpdml0eS9leGFtcGxlLXJlcG8vcGFja2FnZXMvYXBpLy5kbW5vL2NvbmZpZy5tdHMifQ==
