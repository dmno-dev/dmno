// /Users/theo/dmno/dmno-reactivity/example-repo/packages/nextjs-web/.dmno/config.mts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["getResolverCtx"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["defineDmnoService"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/@fs/Users/theo/dmno/dmno-reactivity/packages/plugins/1password/dist/index.js", {"importedNames":["OnePasswordDmnoPlugin"]});



const OnePassBackend = __vite_ssr_import_2__.OnePasswordDmnoPlugin.injectInstance("1pass");
__vite_ssr_exports__.default = __vite_ssr_import_1__.defineDmnoService({
  name: "nextweb",
  parent: "group1",
  icon: "devicon-plain:nextjs",
  pick: [
    "NODE_ENV",
    "DMNO_ENV",
    {
      source: "api",
      key: "API_URL",
      renameKey: "NEXT_PUBLIC_API_URL"
    },
    {
      source: "group1",
      // picking the renamed key from group1
      key: "PICK_TEST_G1",
      renameKey: "PICK_TEST_NW",
      // should apply _after_ the group1 transform
      transformValue: (val) => `${val}-nextwebtransform`
    }
  ],
  schema: {
    FOO: {
      value: "foo",
      description: "test of a public env var without a NEXT_PUBLIC_ prefix"
    },
    SECRET_FOO: {
      value: "secret-foo",
      sensitive: true,
      description: "test of a sensitive env var"
    },
    EMPTY: {
      description: "empty item, should be undefined"
    },
    PUBLIC_STATIC: {
      value: "public-static-default"
    },
    PUBLIC_DYNAMIC: {
      value: "public-dynamic-default",
      dynamic: true
    },
    PUBLIC_DYNAMIC2: {
      value: "public-dynamic-default another!",
      dynamic: true
    },
    SECRET_STATIC: {
      value: "secret-static-default",
      sensitive: true,
      required: true
    },
    SECRET_DYNAMIC: {
      value: "secret-dynamic-default",
      dynamic: true,
      sensitive: true,
      required: true
    },
    NEXT_PUBLIC_STATIC: {
      value: () => __vite_ssr_import_0__.getResolverCtx().get("PUBLIC_STATIC")
    }
  }
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7OztBQUFBO0FBQ0E7QUFFQTtBQUVBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBO0FBQUEsTUFFQTtBQUFBLE1BQ0E7QUFBQTtBQUFBLE1BRUE7QUFBQSxJQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUVBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUdBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUFBLElBR0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFFQTtBQUFBLE1BQ0EsYUFBbUI7QUFBQSxJQUNuQjtBQUFBLEVBRUE7QUFDQSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiY29uZmlnLm10cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEbW5vQmFzZVR5cGVzLCBEbW5vRGF0YVR5cGUsIERtbm9EYXRhVHlwZUZhY3RvcnlGbiwgRXh0cmFjdFNldHRpbmdzU2NoZW1hLCBjYWNoZUZ1bmN0aW9uUmVzdWx0LCBjcmVhdGVEbW5vRGF0YVR5cGUsIGRlZmluZURtbm9TZXJ2aWNlLCBkbW5vRm9ybXVsYSwgc3dpdGNoQnlEbW5vRW52LCBzd2l0Y2hCeU5vZGVFbnYsIH0gZnJvbSAnZG1ubyc7XG5pbXBvcnQgeyBPbmVQYXNzd29yZERtbm9QbHVnaW4gfSBmcm9tICdAZG1uby8xcGFzc3dvcmQtcGx1Z2luJztcblxuY29uc3QgT25lUGFzc0JhY2tlbmQgPSBPbmVQYXNzd29yZERtbm9QbHVnaW4uaW5qZWN0SW5zdGFuY2UoJzFwYXNzJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZURtbm9TZXJ2aWNlKHtcbiAgbmFtZTogJ25leHR3ZWInLFxuICBwYXJlbnQ6ICdncm91cDEnLFxuICBpY29uOiAnZGV2aWNvbi1wbGFpbjpuZXh0anMnLFxuICBwaWNrOiBbXG4gICAgJ05PREVfRU5WJyxcbiAgICAnRE1OT19FTlYnLFxuICAgIHtcbiAgICAgIHNvdXJjZTogJ2FwaScsXG4gICAgICBrZXk6ICdBUElfVVJMJyxcbiAgICAgIHJlbmFtZUtleTogJ05FWFRfUFVCTElDX0FQSV9VUkwnLFxuICAgIH0sXG4gICAge1xuICAgICAgc291cmNlOiAnZ3JvdXAxJyxcbiAgICAgIC8vIHBpY2tpbmcgdGhlIHJlbmFtZWQga2V5IGZyb20gZ3JvdXAxXG4gICAgICBrZXk6ICdQSUNLX1RFU1RfRzEnLFxuICAgICAgcmVuYW1lS2V5OiAnUElDS19URVNUX05XJyxcbiAgICAgIC8vIHNob3VsZCBhcHBseSBfYWZ0ZXJfIHRoZSBncm91cDEgdHJhbnNmb3JtXG4gICAgICB0cmFuc2Zvcm1WYWx1ZTogKHZhbCkgPT4gYCR7dmFsfS1uZXh0d2VidHJhbnNmb3JtYCxcbiAgICB9XG4gIF0sXG4gIHNjaGVtYToge1xuICAgIEZPTzoge1xuICAgICAgdmFsdWU6ICdmb28nLFxuICAgICAgZGVzY3JpcHRpb246ICd0ZXN0IG9mIGEgcHVibGljIGVudiB2YXIgd2l0aG91dCBhIE5FWFRfUFVCTElDXyBwcmVmaXgnLFxuICAgIH0sXG4gICAgU0VDUkVUX0ZPTzoge1xuICAgICAgdmFsdWU6ICdzZWNyZXQtZm9vJyxcbiAgICAgIHNlbnNpdGl2ZTogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAndGVzdCBvZiBhIHNlbnNpdGl2ZSBlbnYgdmFyJyxcbiAgICB9LFxuXG4gICAgRU1QVFk6IHtcbiAgICAgIGRlc2NyaXB0aW9uOiAnZW1wdHkgaXRlbSwgc2hvdWxkIGJlIHVuZGVmaW5lZCcsXG4gICAgfSxcblxuICAgIFxuICAgIFBVQkxJQ19TVEFUSUM6IHtcbiAgICAgIHZhbHVlOiAncHVibGljLXN0YXRpYy1kZWZhdWx0JyxcbiAgICB9LFxuICAgIFBVQkxJQ19EWU5BTUlDOiB7XG4gICAgICB2YWx1ZTogJ3B1YmxpYy1keW5hbWljLWRlZmF1bHQnLFxuICAgICAgZHluYW1pYzogdHJ1ZSxcbiAgICB9LFxuXG4gICAgUFVCTElDX0RZTkFNSUMyOiB7XG4gICAgICB2YWx1ZTogJ3B1YmxpYy1keW5hbWljLWRlZmF1bHQgYW5vdGhlciEnLFxuICAgICAgZHluYW1pYzogdHJ1ZSxcbiAgICB9LFxuXG5cbiAgICBTRUNSRVRfU1RBVElDOiB7XG4gICAgICB2YWx1ZTogJ3NlY3JldC1zdGF0aWMtZGVmYXVsdCcsXG4gICAgICBzZW5zaXRpdmU6IHRydWUsXG4gICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICB9LFxuICAgIFNFQ1JFVF9EWU5BTUlDOiB7XG4gICAgICB2YWx1ZTogJ3NlY3JldC1keW5hbWljLWRlZmF1bHQnLFxuICAgICAgZHluYW1pYzogdHJ1ZSxcbiAgICAgIHNlbnNpdGl2ZTogdHJ1ZSxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIH0sXG4gICAgXG4gICAgTkVYVF9QVUJMSUNfU1RBVElDOiB7XG4gICAgICB2YWx1ZTogKCkgPT4gRE1OT19DT05GSUcuUFVCTElDX1NUQVRJQyxcbiAgICB9LFxuXG4gIH0sXG59KVxuIl0sImZpbGUiOiIvVXNlcnMvdGhlby9kbW5vL2Rtbm8tcmVhY3Rpdml0eS9leGFtcGxlLXJlcG8vcGFja2FnZXMvbmV4dGpzLXdlYi8uZG1uby9jb25maWcubXRzIn0=
