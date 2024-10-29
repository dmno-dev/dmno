// tsup.config.ts
import { defineConfig } from "tsup";
var tsup_config_default = defineConfig({
  entry: [
    // Entry point(s)
    "src/index.ts",
    // main lib, users will import from here
    "src/inject-dmno-client.ts"
  ],
  external: [
    "next"
  ],
  noExternal: [
    "dmno/inject-globals",
    "dmno/injector-standalone",
    "dmno/injector-standalone-edge",
    "dmno/patch-server-response-standalone"
  ],
  dts: true,
  // Generate .d.ts files
  // minify: true, // Minify output
  sourcemap: true,
  // Generate sourcemaps
  treeshake: true,
  // Remove unused code
  clean: false,
  // Clean output directory before building
  outDir: "dist",
  // Output directory
  format: ["esm", "cjs"],
  // Output format(s)
  splitting: false,
  keepNames: true
  // stops build from prefixing our class names with `_` in some cases
});
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL1VzZXJzL3RoZW8vZG1uby9kbW5vLXJlYWN0aXZpdHkvcGFja2FnZXMvaW50ZWdyYXRpb25zL25leHRqcy90c3VwLmNvbmZpZy50c1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCIvVXNlcnMvdGhlby9kbW5vL2Rtbm8tcmVhY3Rpdml0eS9wYWNrYWdlcy9pbnRlZ3JhdGlvbnMvbmV4dGpzXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9Vc2Vycy90aGVvL2Rtbm8vZG1uby1yZWFjdGl2aXR5L3BhY2thZ2VzL2ludGVncmF0aW9ucy9uZXh0anMvdHN1cC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd0c3VwJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgZW50cnk6IFsgLy8gRW50cnkgcG9pbnQocylcbiAgICAnc3JjL2luZGV4LnRzJywgLy8gbWFpbiBsaWIsIHVzZXJzIHdpbGwgaW1wb3J0IGZyb20gaGVyZVxuICAgICdzcmMvaW5qZWN0LWRtbm8tY2xpZW50LnRzJyxcbiAgXSwgXG5cbiAgZXh0ZXJuYWw6IFtcbiAgICBcIm5leHRcIixcbiAgXSxcbiAgbm9FeHRlcm5hbDogW1xuICAgICdkbW5vL2luamVjdC1nbG9iYWxzJyxcbiAgICAnZG1uby9pbmplY3Rvci1zdGFuZGFsb25lJyxcbiAgICAnZG1uby9pbmplY3Rvci1zdGFuZGFsb25lLWVkZ2UnLFxuICAgICdkbW5vL3BhdGNoLXNlcnZlci1yZXNwb25zZS1zdGFuZGFsb25lJ1xuICBdLFxuXG4gIGR0czogdHJ1ZSwgLy8gR2VuZXJhdGUgLmQudHMgZmlsZXNcbiAgLy8gbWluaWZ5OiB0cnVlLCAvLyBNaW5pZnkgb3V0cHV0XG4gIHNvdXJjZW1hcDogdHJ1ZSwgLy8gR2VuZXJhdGUgc291cmNlbWFwc1xuICB0cmVlc2hha2U6IHRydWUsIC8vIFJlbW92ZSB1bnVzZWQgY29kZVxuICBcbiAgY2xlYW46IGZhbHNlLCAvLyBDbGVhbiBvdXRwdXQgZGlyZWN0b3J5IGJlZm9yZSBidWlsZGluZ1xuICBvdXREaXI6IFwiZGlzdFwiLCAvLyBPdXRwdXQgZGlyZWN0b3J5XG4gIFxuICBmb3JtYXQ6IFsnZXNtJywgJ2NqcyddLCAvLyBPdXRwdXQgZm9ybWF0KHMpXG4gIFxuICBzcGxpdHRpbmc6IGZhbHNlLFxuICBrZWVwTmFtZXM6IHRydWUsIC8vIHN0b3BzIGJ1aWxkIGZyb20gcHJlZml4aW5nIG91ciBjbGFzcyBuYW1lcyB3aXRoIGBfYCBpbiBzb21lIGNhc2VzXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBcVUsU0FBUyxvQkFBb0I7QUFFbFcsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsT0FBTztBQUFBO0FBQUEsSUFDTDtBQUFBO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFBQSxFQUVBLFVBQVU7QUFBQSxJQUNSO0FBQUEsRUFDRjtBQUFBLEVBQ0EsWUFBWTtBQUFBLElBQ1Y7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQUEsRUFFQSxLQUFLO0FBQUE7QUFBQTtBQUFBLEVBRUwsV0FBVztBQUFBO0FBQUEsRUFDWCxXQUFXO0FBQUE7QUFBQSxFQUVYLE9BQU87QUFBQTtBQUFBLEVBQ1AsUUFBUTtBQUFBO0FBQUEsRUFFUixRQUFRLENBQUMsT0FBTyxLQUFLO0FBQUE7QUFBQSxFQUVyQixXQUFXO0FBQUEsRUFDWCxXQUFXO0FBQUE7QUFDYixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
