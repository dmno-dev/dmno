// /Users/theo/dmno/dmno-reactivity/example-repo/packages/group1/.dmno/config.mts
const __vite_ssr_import_0__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["DmnoBaseTypes","defineDmnoService"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/@fs/Users/theo/dmno/dmno-reactivity/packages/plugins/1password/dist/index.js", {"importedNames":["OnePasswordDmnoPlugin"]});


const OnePassBackend = __vite_ssr_import_1__.OnePasswordDmnoPlugin.injectInstance("1pass");
__vite_ssr_exports__.default = __vite_ssr_import_0__.defineDmnoService({
  name: "group1",
  pick: [
    {
      source: "root",
      key: "PICK_TEST",
      renameKey: "PICK_TEST_G1",
      transformValue: (val) => `${val}-group1transform`
    }
  ],
  schema: {
    GROUP1_THINGY: {
      extends: __vite_ssr_import_0__.DmnoBaseTypes.number,
      description: "thing related to only group1"
    },
    OP_TEST: {
      value: OnePassBackend.item()
    }
  }
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7QUFBQTtBQUNBO0FBRUE7QUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxJQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsRUFDQTtBQUNBIiwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJjb25maWcubXRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERtbm9CYXNlVHlwZXMsIGRlZmluZURtbm9TZXJ2aWNlIH0gZnJvbSAnZG1ubyc7XG5pbXBvcnQgeyBPbmVQYXNzd29yZERtbm9QbHVnaW4gfSBmcm9tICdAZG1uby8xcGFzc3dvcmQtcGx1Z2luJztcblxuY29uc3QgT25lUGFzc0JhY2tlbmQgPSBPbmVQYXNzd29yZERtbm9QbHVnaW4uaW5qZWN0SW5zdGFuY2UoJzFwYXNzJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZURtbm9TZXJ2aWNlKHtcbiAgbmFtZTogJ2dyb3VwMScsXG4gIHBpY2s6IFtcbiAgICB7XG4gICAgICBzb3VyY2U6ICdyb290JyxcbiAgICAgIGtleTogJ1BJQ0tfVEVTVCcsXG4gICAgICByZW5hbWVLZXk6ICdQSUNLX1RFU1RfRzEnLFxuICAgICAgdHJhbnNmb3JtVmFsdWU6ICh2YWwpID0+IGAke3ZhbH0tZ3JvdXAxdHJhbnNmb3JtYCxcbiAgICB9XG4gIF0sXG4gIHNjaGVtYToge1xuICAgIEdST1VQMV9USElOR1k6IHtcbiAgICAgIGV4dGVuZHM6IERtbm9CYXNlVHlwZXMubnVtYmVyLFxuICAgICAgZGVzY3JpcHRpb246ICd0aGluZyByZWxhdGVkIHRvIG9ubHkgZ3JvdXAxJyxcbiAgICB9LFxuICAgIE9QX1RFU1Q6IHtcbiAgICAgIHZhbHVlOiBPbmVQYXNzQmFja2VuZC5pdGVtKCksXG4gICAgfVxuICB9LFxufSk7XG4iXSwiZmlsZSI6Ii9Vc2Vycy90aGVvL2Rtbm8vZG1uby1yZWFjdGl2aXR5L2V4YW1wbGUtcmVwby9wYWNrYWdlcy9ncm91cDEvLmRtbm8vY29uZmlnLm10cyJ9
