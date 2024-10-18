// /Users/theo/dmno/dmno-reactivity/packages/plugins/encrypted-vault/dist/index.js
const __vite_ssr_import_0__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["getResolverCtx"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/@fs/Users/theo/dmno/dmno-reactivity/packages/plugins/encrypted-vault/dist/chunk-ZJOMMXAU.js", {"importedNames":["__name","decrypt","importDmnoEncryptionKeyString"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["createDmnoDataType","DmnoBaseTypes","DmnoPlugin","DmnoConfigraphServiceEntity","ResolutionError"]});
const __vite_ssr_import_3__ = await __vite_ssr_import__("fs", {"importedNames":["default"]});
const __vite_ssr_import_4__ = await __vite_ssr_import__("jsonc-parser", {"importedNames":["parse"]});






var DmnoEncryptionKey = __vite_ssr_import_2__.createDmnoDataType({
  typeLabel: "dmno/encryption-key",
  extends: __vite_ssr_import_2__.DmnoBaseTypes.string({
    startsWith: "dmno//"
  }),
  // TODO: more validation
  typeDescription: "AES-256-GCM encryption key, used for encrypting secrets in dmno",
  externalDocs: {
    description: "dmno docs",
    url: "https://dmno.dev/docs/"
  },
  ui: {
    icon: "material-symbols:key"
  },
  sensitive: true
});
var EncryptedVaultTypes = {
  encryptionKey: DmnoEncryptionKey
};

// package.json
var name = "@dmno/encrypted-vault-plugin";
var version = "0.0.6";

// src/plugin.ts
var __dirname = globalThis.__dirname ?? __vite_ssr_import_meta__.dirname;
var EncryptedVaultItem = class {
  constructor(serviceName, path, val, updatedAt = /* @__PURE__ */ new Date()) {
    this.serviceName = serviceName;
    this.path = path;
    this.updatedAt = updatedAt;
    if ("encrypted" in val) {
      this.encryptedValue = val.encrypted;
    } else {
      this.rawValue = val.raw;
    }
  }
  static {
    __vite_ssr_import_1__.__name(this, "EncryptedVaultItem");
  }
  encryptedValue;
  rawValue;
  key;
  async getRawValue(key, keyName) {
    if (this.rawValue) return this.rawValue;
    if (!this.encryptedValue) throw new Error("item is empty");
    this.rawValue = await __vite_ssr_import_1__.decrypt(key, this.encryptedValue, keyName);
    return this.rawValue;
  }
};
var EncryptedVaultDmnoPlugin = class extends __vite_ssr_import_2__.DmnoPlugin {
  static {
    __vite_ssr_import_1__.__name(this, "EncryptedVaultDmnoPlugin");
  }
  constructor(instanceId, inputValues) {
    super(instanceId, {
      inputSchema: {
        key: {
          description: "the key to use to encrypt/decrypt this vault file",
          extends: EncryptedVaultTypes.encryptionKey,
          required: true,
          value: inputValues.key
        },
        name: {
          description: "the name of the vault - will be used in the vault filename",
          extends: "string",
          value: inputValues.name
        }
      }
    });
  }
  static cliPath = `${__dirname}/cli/cli`;
  static pluginPackageName = name;
  static pluginPackageVersion = version;
  // constructor(
  //   instanceName: string,
  //   inputs: DmnoPluginInputMap<typeof EncryptedVaultDmnoPlugin.inputSchema>,
  // ) {
  //   super(instanceName);
  //   this.setInputMap(inputs);
  // }
  vaultFilePath;
  vaultFileLoaded = false;
  vaultItems = {};
  async loadVaultFile() {
    const parentDmnoService = this.internalEntity?.parentEntity;
    if (!parentDmnoService) {
      throw new Error("plugin must be owned by an entity");
    }
    if (!(parentDmnoService instanceof __vite_ssr_import_2__.DmnoConfigraphServiceEntity)) {
      throw new Error("parent must be a DMNO service");
    }
    const servicePath = parentDmnoService.getMetadata("path");
    const encrpytionKey = this.inputValue("key");
    if (!encrpytionKey) {
      throw new Error("encryption key must be set");
    }
    const importedKey = await __vite_ssr_import_1__.importDmnoEncryptionKeyString(encrpytionKey);
    this.vaultKey = importedKey.key;
    this.vaultKeyName = importedKey.keyName;
    this.vaultFilePath = `${servicePath}/.dmno/${this.inputValue("name") || "default"}.vault.json`;
    const vaultFileRaw = await __vite_ssr_import_3__.default.promises.readFile(this.vaultFilePath, "utf-8");
    const vaultFileObj = __vite_ssr_import_4__.parse(vaultFileRaw.toString());
    for (const key in vaultFileObj.items) {
      const vaultFileItem = vaultFileObj.items[key];
      const [serviceName, path] = key.split("!");
      this.vaultItems[key] = new EncryptedVaultItem(
        serviceName,
        path,
        { encrypted: vaultFileItem.encryptedValue },
        new Date(vaultFileItem.updatedAt)
      );
    }
  }
  // private hooks = {
  //   onInitComplete: async () => {
  //
  //     _.each(this.vaultItems, (vi) => {
  //       vi.key = this.vaultKey;
  //     });
  //   },
  // };
  vaultKey;
  vaultKeyName;
  item() {
    return this.createResolver({
      icon: "mdi:archive-lock",
      // also mdi:file-lock ?
      label: "encrypted vault item",
      resolve: /* @__PURE__ */ __vite_ssr_import_1__.__name(async (ctx) => {
        if (!this.vaultFileLoaded) await this.loadVaultFile();
        const vaultItem = this.vaultItems[ctx.resolverFullPath];
        if (!vaultItem) throw new __vite_ssr_import_2__.ResolutionError(`Item not found - ${ctx.entityId} / ${ctx.resolverFullPath}`);
        return await vaultItem.getRawValue(this.vaultKey, this.vaultKeyName);
      }, "resolve")
    });
  }
};


Object.defineProperty(__vite_ssr_exports__, "EncryptedVaultDmnoPlugin", { enumerable: true, configurable: true, get(){ return EncryptedVaultDmnoPlugin }});
Object.defineProperty(__vite_ssr_exports__, "EncryptedVaultItem", { enumerable: true, configurable: true, get(){ return EncryptedVaultItem }});
Object.defineProperty(__vite_ssr_exports__, "EncryptedVaultTypes", { enumerable: true, configurable: true, get(){ return EncryptedVaultTypes }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7Ozs7Ozs7Ozs7QUFFQTtBQUE2QztBQUNoQztBQUNtQjtBQUNoQjtBQUNiO0FBQUE7QUFFZ0I7QUFDSDtBQUNDO0FBQ1I7QUFDUDtBQUNJO0FBQ0k7QUFDUjtBQUVGO0FBRU87QUFBNEI7QUFFbkM7OztBQ3BCRTtBQUNBOzs7QUNtQkY7QUFHTztBQUF5QjtBQU1uQjtBQUNBO0FBRUE7QUFFVDtBQUNFO0FBQTBCO0FBRTFCO0FBQW9CO0FBQ3RCO0FBQ0Y7QUFoQjhCO0FBQUE7QUFBQTtBQUN0QjtBQUNBO0FBQ1I7QUFnQkU7QUFDQTtBQUNBO0FBQ0E7QUFBWTtBQUVoQjtBQUVhO0FBQTRDO0FBQUE7QUFBQTtBQUFBO0FBUXJEO0FBQWtCO0FBQ0g7QUFDTjtBQUNVO0FBQ2dCO0FBQ25CO0FBQ1M7QUFDckI7QUFDTTtBQUNTO0FBQ0o7QUFDVTtBQUNyQjtBQUNGO0FBQ0Q7QUFDSDtBQUU2QjtBQUNGO0FBQ0c7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVd0QjtBQUNrQjtBQUNnQztBQUV4RDtBQUNBO0FBQ0U7QUFBbUQ7QUFFckQ7QUFDRTtBQUErQztBQUVqRDtBQUVBO0FBQ0E7QUFDRTtBQUE0QztBQUc5QztBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNFO0FBQ0E7QUFDQTtBQUEyQjtBQUN6QjtBQUNBO0FBQzBDO0FBQ1Y7QUFDbEM7QUFDRjtBQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVdRO0FBQ0E7QUFHTjtBQUEyQjtBQUNuQjtBQUFBO0FBQ0M7QUFHTDtBQUtBO0FBQ0E7QUFDQTtBQUFxRTtBQVQ5RDtBQVdWO0FBRUwiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIi4uL3NyYy9kYXRhLXR5cGVzLnRzIiwiLi4vcGFja2FnZS5qc29uIiwiLi4vc3JjL3BsdWdpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEbW5vQmFzZVR5cGVzLCBjcmVhdGVEbW5vRGF0YVR5cGUgfSBmcm9tICdkbW5vJztcblxuY29uc3QgRG1ub0VuY3J5cHRpb25LZXkgPSBjcmVhdGVEbW5vRGF0YVR5cGUoe1xuICB0eXBlTGFiZWw6ICdkbW5vL2VuY3J5cHRpb24ta2V5JyxcbiAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5zdHJpbmcoe1xuICAgIHN0YXJ0c1dpdGg6ICdkbW5vLy8nLFxuICB9KSxcbiAgLy8gVE9ETzogbW9yZSB2YWxpZGF0aW9uXG4gIHR5cGVEZXNjcmlwdGlvbjogJ0FFUy0yNTYtR0NNIGVuY3J5cHRpb24ga2V5LCB1c2VkIGZvciBlbmNyeXB0aW5nIHNlY3JldHMgaW4gZG1ubycsXG4gIGV4dGVybmFsRG9jczoge1xuICAgIGRlc2NyaXB0aW9uOiAnZG1ubyBkb2NzJyxcbiAgICB1cmw6ICdodHRwczovL2Rtbm8uZGV2L2RvY3MvJyxcbiAgfSxcbiAgdWk6IHtcbiAgICBpY29uOiAnbWF0ZXJpYWwtc3ltYm9sczprZXknLFxuICB9LFxuICBzZW5zaXRpdmU6IHRydWUsXG59KTtcblxuZXhwb3J0IGNvbnN0IEVuY3J5cHRlZFZhdWx0VHlwZXMgPSB7XG4gIGVuY3J5cHRpb25LZXk6IERtbm9FbmNyeXB0aW9uS2V5LFxufTtcbiIsIntcbiAgXCJuYW1lXCI6IFwiQGRtbm8vZW5jcnlwdGVkLXZhdWx0LXBsdWdpblwiLFxuICBcInZlcnNpb25cIjogXCIwLjAuNlwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiZG1ubyBwbHVnaW4gdG8gc3RvcmUgc2VjcmV0cyBlbmNyeXB0ZWQgaW4geW91ciByZXBvXCIsXG4gIFwiYXV0aG9yXCI6IFwiZG1uby1kZXZcIixcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJnaXQraHR0cHM6Ly9naXRodWIuY29tL2Rtbm8tZGV2L2Rtbm8uZ2l0XCIsXG4gICAgXCJkaXJlY3RvcnlcIjogXCJwYWNrYWdlcy9wbHVnaW5zL2VuY3J5cHRlZC12YXVsdFwiXG4gIH0sXG4gIFwiYnVnc1wiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9kbW5vLWRldi9kbW5vL2lzc3Vlc1wiLFxuICBcImhvbWVwYWdlXCI6IFwiaHR0cHM6Ly9kbW5vLmRldi9kb2NzL3BsdWdpbnMvZW5jcnlwdGVkLXZhdWx0XCIsXG4gIFwia2V5d29yZHNcIjogW1xuICAgIFwiZG1ub1wiLFxuICAgIFwiZW5jcnlwdGVkIHZhdWx0XCIsXG4gICAgXCJlbmNyeXB0ZWQgc2VjcmV0c1wiLFxuICAgIFwiZW5jcnlwdGlvblwiLFxuICAgIFwiZ2l0XCIsXG4gICAgXCJjb25maWdcIixcbiAgICBcImVudiB2YXJzXCIsXG4gICAgXCJlbnZpcm9ubWVudCB2YXJpYWJsZXNcIixcbiAgICBcInNlY3JldHNcIixcbiAgICBcImRtbm8tcGx1Z2luXCJcbiAgXSxcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwiZXhwb3J0c1wiOiB7XG4gICAgXCIuXCI6IHtcbiAgICAgIFwidHMtc3JjXCI6IFwiLi9zcmMvaW5kZXgudHNcIixcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L2luZGV4LmpzXCIsXG4gICAgICBcInR5cGVzXCI6IFwiLi9kaXN0L2luZGV4LmQudHNcIlxuICAgIH1cbiAgfSxcbiAgXCJmaWxlc1wiOiBbXG4gICAgXCIvZGlzdFwiXG4gIF0sXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJidWlsZFwiOiBcInRzdXBcIixcbiAgICBcImJ1aWxkOmlmbm9kaXN0XCI6IFwiWyAtZCBcXFwiLi9kaXN0XFxcIiBdICYmIGVjaG8gJ2Rpc3QgZXhpc3RzJyB8fCBwbnBtIGJ1aWxkXCIsXG4gICAgXCJkZXZcIjogXCJwbnBtIHJ1biBidWlsZCAtLXdhdGNoXCIsXG4gICAgXCJsaW50XCI6IFwiZXNsaW50IHNyYyAtLWV4dCAudHMsLmNqc1wiLFxuICAgIFwibGludDpmaXhcIjogXCJwbnBtIHJ1biBsaW50IC0tZml4XCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiZG1ub1wiOiBcIndvcmtzcGFjZToqXCIsXG4gICAgXCJAZG1uby9lbmNyeXB0aW9uLWxpYlwiOiBcIndvcmtzcGFjZToqXCIsXG4gICAgXCJAZG1uby9lc2xpbnQtY29uZmlnXCI6IFwid29ya3NwYWNlOipcIixcbiAgICBcIkBkbW5vL3RzLWxpYlwiOiBcIndvcmtzcGFjZToqXCIsXG4gICAgXCJAZG1uby90c2NvbmZpZ1wiOiBcIndvcmtzcGFjZToqXCIsXG4gICAgXCJAdHlwZXMvYXN5bmNcIjogXCJeMy4yLjI0XCIsXG4gICAgXCJAdHlwZXMvbG9kYXNoLWVzXCI6IFwiY2F0YWxvZzpcIixcbiAgICBcIkB0eXBlcy9ub2RlXCI6IFwiY2F0YWxvZzpcIixcbiAgICBcInRzdXBcIjogXCJjYXRhbG9nOlwiLFxuICAgIFwidHlwZXNjcmlwdFwiOiBcImNhdGFsb2c6XCJcbiAgfSxcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQGlucXVpcmVyL3Byb21wdHNcIjogXCJeNC4zLjBcIixcbiAgICBcImFzeW5jXCI6IFwiXjMuMi41XCIsXG4gICAgXCJiYXNlNjQtYXJyYXlidWZmZXJcIjogXCJjYXRhbG9nOlwiLFxuICAgIFwianNvbmMtcGFyc2VyXCI6IFwiXjMuMi4xXCIsXG4gICAgXCJsb2Rhc2gtZXNcIjogXCJjYXRhbG9nOlwiXG4gIH0sXG4gIFwicGVlckRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJkbW5vXCI6IFwiXjBcIlxuICB9XG59XG4iLCJpbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcbmltcG9ydCBjcnlwdG8gZnJvbSAnbm9kZTpjcnlwdG8nO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoLWVzJztcbmltcG9ydCB7IHBhcnNlIGFzIHBhcnNlSlNPTkMgfSBmcm9tICdqc29uYy1wYXJzZXInO1xuaW1wb3J0IHtcbiAgRG1ub1BsdWdpbixcbiAgUmVzb2x1dGlvbkVycm9yLFxuICBEbW5vQ29uZmlncmFwaFNlcnZpY2VFbnRpdHksXG4gIFBsdWdpbklucHV0VmFsdWUsXG4gIERtbm9TZXJ2aWNlLFxufSBmcm9tICdkbW5vJztcbmltcG9ydCB7XG4gIGRlY3J5cHQsIGVuY3J5cHQsIGdlbmVyYXRlRW5jcnlwdGlvbktleVN0cmluZywgaW1wb3J0RG1ub0VuY3J5cHRpb25LZXlTdHJpbmcsXG59IGZyb20gJ0BkbW5vL2VuY3J5cHRpb24tbGliJztcbmltcG9ydCB7IG5hbWUgYXMgdGhpc1BhY2thZ2VOYW1lLCB2ZXJzaW9uIGFzIHRoaXNQYWNrYWdlVmVyc2lvbiB9IGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5cbmltcG9ydCB7IEVuY3J5cHRlZFZhdWx0VHlwZXMgfSBmcm9tICcuL2RhdGEtdHlwZXMnO1xuXG5jb25zdCBfX2Rpcm5hbWUgPSBnbG9iYWxUaGlzLl9fZGlybmFtZSA/PyBpbXBvcnQubWV0YS5kaXJuYW1lO1xuY29uc3QgX19maWxlbmFtZSA9IGdsb2JhbFRoaXMuX19maWxlbmFtZSA/PyBpbXBvcnQubWV0YS5maWxlbmFtZTtcblxuZXhwb3J0IGNsYXNzIEVuY3J5cHRlZFZhdWx0SXRlbSB7XG4gIHByaXZhdGUgZW5jcnlwdGVkVmFsdWU/OiBzdHJpbmc7XG4gIHByaXZhdGUgcmF3VmFsdWU/OiBhbnk7XG4gIGtleT86IGNyeXB0by53ZWJjcnlwdG8uQ3J5cHRvS2V5O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHJlYWRvbmx5IHNlcnZpY2VOYW1lOiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgcGF0aDogc3RyaW5nLFxuICAgIHZhbDogeyBlbmNyeXB0ZWQ6IHN0cmluZyB9IHwgeyByYXc6IGFueSB9LFxuICAgIHJlYWRvbmx5IHVwZGF0ZWRBdCA9IG5ldyBEYXRlKCksXG4gICkge1xuICAgIGlmICgnZW5jcnlwdGVkJyBpbiB2YWwpIHtcbiAgICAgIHRoaXMuZW5jcnlwdGVkVmFsdWUgPSB2YWwuZW5jcnlwdGVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJhd1ZhbHVlID0gdmFsLnJhdztcbiAgICB9XG4gIH1cblxuICBhc3luYyBnZXRSYXdWYWx1ZShrZXk6IGNyeXB0by53ZWJjcnlwdG8uQ3J5cHRvS2V5LCBrZXlOYW1lOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5yYXdWYWx1ZSkgcmV0dXJuIHRoaXMucmF3VmFsdWU7XG4gICAgaWYgKCF0aGlzLmVuY3J5cHRlZFZhbHVlKSB0aHJvdyBuZXcgRXJyb3IoJ2l0ZW0gaXMgZW1wdHknKTtcbiAgICB0aGlzLnJhd1ZhbHVlID0gYXdhaXQgZGVjcnlwdChrZXksIHRoaXMuZW5jcnlwdGVkVmFsdWUsIGtleU5hbWUpO1xuICAgIHJldHVybiB0aGlzLnJhd1ZhbHVlO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFbmNyeXB0ZWRWYXVsdERtbm9QbHVnaW4gZXh0ZW5kcyBEbW5vUGx1Z2luIHtcbiAgY29uc3RydWN0b3IoXG4gICAgaW5zdGFuY2VJZDogc3RyaW5nLFxuICAgIGlucHV0VmFsdWVzOiB7XG4gICAgICBuYW1lPzogc3RyaW5nLFxuICAgICAga2V5OiBQbHVnaW5JbnB1dFZhbHVlLFxuICAgIH0sXG4gICkge1xuICAgIHN1cGVyKGluc3RhbmNlSWQsIHtcbiAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgIGtleToge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOiAndGhlIGtleSB0byB1c2UgdG8gZW5jcnlwdC9kZWNyeXB0IHRoaXMgdmF1bHQgZmlsZScsXG4gICAgICAgICAgZXh0ZW5kczogRW5jcnlwdGVkVmF1bHRUeXBlcy5lbmNyeXB0aW9uS2V5LFxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIHZhbHVlOiBpbnB1dFZhbHVlcy5rZXksXG4gICAgICAgIH0sXG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ3RoZSBuYW1lIG9mIHRoZSB2YXVsdCAtIHdpbGwgYmUgdXNlZCBpbiB0aGUgdmF1bHQgZmlsZW5hbWUnLFxuICAgICAgICAgIGV4dGVuZHM6ICdzdHJpbmcnLFxuICAgICAgICAgIHZhbHVlOiBpbnB1dFZhbHVlcy5uYW1lLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHN0YXRpYyBjbGlQYXRoID0gYCR7X19kaXJuYW1lfS9jbGkvY2xpYDtcbiAgc3RhdGljIHBsdWdpblBhY2thZ2VOYW1lID0gdGhpc1BhY2thZ2VOYW1lO1xuICBzdGF0aWMgcGx1Z2luUGFja2FnZVZlcnNpb24gPSB0aGlzUGFja2FnZVZlcnNpb247XG5cbiAgLy8gY29uc3RydWN0b3IoXG4gIC8vICAgaW5zdGFuY2VOYW1lOiBzdHJpbmcsXG4gIC8vICAgaW5wdXRzOiBEbW5vUGx1Z2luSW5wdXRNYXA8dHlwZW9mIEVuY3J5cHRlZFZhdWx0RG1ub1BsdWdpbi5pbnB1dFNjaGVtYT4sXG4gIC8vICkge1xuICAvLyAgIHN1cGVyKGluc3RhbmNlTmFtZSk7XG4gIC8vICAgdGhpcy5zZXRJbnB1dE1hcChpbnB1dHMpO1xuICAvLyB9XG5cblxuICBwcml2YXRlIHZhdWx0RmlsZVBhdGg/OiBzdHJpbmc7XG4gIHByaXZhdGUgdmF1bHRGaWxlTG9hZGVkID0gZmFsc2U7XG4gIHByaXZhdGUgdmF1bHRJdGVtczogUmVjb3JkPHN0cmluZywgRW5jcnlwdGVkVmF1bHRJdGVtPiA9IHt9O1xuICBwcml2YXRlIGFzeW5jIGxvYWRWYXVsdEZpbGUoKSB7XG4gICAgY29uc3QgcGFyZW50RG1ub1NlcnZpY2UgPSB0aGlzLmludGVybmFsRW50aXR5Py5wYXJlbnRFbnRpdHk7XG4gICAgaWYgKCFwYXJlbnREbW5vU2VydmljZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdwbHVnaW4gbXVzdCBiZSBvd25lZCBieSBhbiBlbnRpdHknKTtcbiAgICB9XG4gICAgaWYgKCEocGFyZW50RG1ub1NlcnZpY2UgaW5zdGFuY2VvZiBEbW5vQ29uZmlncmFwaFNlcnZpY2VFbnRpdHkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BhcmVudCBtdXN0IGJlIGEgRE1OTyBzZXJ2aWNlJyk7XG4gICAgfVxuICAgIGNvbnN0IHNlcnZpY2VQYXRoID0gcGFyZW50RG1ub1NlcnZpY2UuZ2V0TWV0YWRhdGEoJ3BhdGgnKTtcblxuICAgIGNvbnN0IGVuY3JweXRpb25LZXkgPSB0aGlzLmlucHV0VmFsdWUoJ2tleScpO1xuICAgIGlmICghZW5jcnB5dGlvbktleSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdlbmNyeXB0aW9uIGtleSBtdXN0IGJlIHNldCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydGVkS2V5ID0gYXdhaXQgaW1wb3J0RG1ub0VuY3J5cHRpb25LZXlTdHJpbmcoZW5jcnB5dGlvbktleSBhcyBzdHJpbmcpO1xuICAgIHRoaXMudmF1bHRLZXkgPSBpbXBvcnRlZEtleS5rZXk7XG4gICAgdGhpcy52YXVsdEtleU5hbWUgPSBpbXBvcnRlZEtleS5rZXlOYW1lO1xuXG4gICAgdGhpcy52YXVsdEZpbGVQYXRoID0gYCR7c2VydmljZVBhdGh9Ly5kbW5vLyR7dGhpcy5pbnB1dFZhbHVlKCduYW1lJykgfHwgJ2RlZmF1bHQnfS52YXVsdC5qc29uYDtcbiAgICBjb25zdCB2YXVsdEZpbGVSYXcgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZSh0aGlzLnZhdWx0RmlsZVBhdGgsICd1dGYtOCcpO1xuICAgIGNvbnN0IHZhdWx0RmlsZU9iaiA9IHBhcnNlSlNPTkModmF1bHRGaWxlUmF3LnRvU3RyaW5nKCkpO1xuICAgIGZvciAoY29uc3Qga2V5IGluIHZhdWx0RmlsZU9iai5pdGVtcykge1xuICAgICAgY29uc3QgdmF1bHRGaWxlSXRlbSA9IHZhdWx0RmlsZU9iai5pdGVtc1trZXldO1xuICAgICAgY29uc3QgW3NlcnZpY2VOYW1lLCBwYXRoXSA9IGtleS5zcGxpdCgnIScpO1xuICAgICAgdGhpcy52YXVsdEl0ZW1zW2tleV0gPSBuZXcgRW5jcnlwdGVkVmF1bHRJdGVtKFxuICAgICAgICBzZXJ2aWNlTmFtZSxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgeyBlbmNyeXB0ZWQ6IHZhdWx0RmlsZUl0ZW0uZW5jcnlwdGVkVmFsdWUgfSxcbiAgICAgICAgbmV3IERhdGUodmF1bHRGaWxlSXRlbS51cGRhdGVkQXQpLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBwcml2YXRlIGhvb2tzID0ge1xuICAvLyAgIG9uSW5pdENvbXBsZXRlOiBhc3luYyAoKSA9PiB7XG4gIC8vXG4gIC8vICAgICBfLmVhY2godGhpcy52YXVsdEl0ZW1zLCAodmkpID0+IHtcbiAgLy8gICAgICAgdmkua2V5ID0gdGhpcy52YXVsdEtleTtcbiAgLy8gICAgIH0pO1xuICAvLyAgIH0sXG4gIC8vIH07XG5cbiAgcHJpdmF0ZSB2YXVsdEtleT86IGNyeXB0by53ZWJjcnlwdG8uQ3J5cHRvS2V5O1xuICBwcml2YXRlIHZhdWx0S2V5TmFtZT86IHN0cmluZztcblxuICBpdGVtKCkge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZVJlc29sdmVyKHtcbiAgICAgIGljb246ICdtZGk6YXJjaGl2ZS1sb2NrJywgLy8gYWxzbyBtZGk6ZmlsZS1sb2NrID9cbiAgICAgIGxhYmVsOiAnZW5jcnlwdGVkIHZhdWx0IGl0ZW0nLFxuICAgICAgcmVzb2x2ZTogYXN5bmMgKGN0eCkgPT4ge1xuICAgICAgICAvLyBwcm9iYWJseSBzaG91bGQgYmUgdHJpZ2dlcmVkIGJ5IHNvbWUgbGlmZWN5Y2xlIGhvb2sgcmF0aGVyIHRoYW4gaGVyZT9cbiAgICAgICAgaWYgKCF0aGlzLnZhdWx0RmlsZUxvYWRlZCkgYXdhaXQgdGhpcy5sb2FkVmF1bHRGaWxlKCk7XG5cblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhjdHgpO1xuXG4gICAgICAgIGNvbnN0IHZhdWx0SXRlbSA9IHRoaXMudmF1bHRJdGVtc1tjdHgucmVzb2x2ZXJGdWxsUGF0aF07XG4gICAgICAgIGlmICghdmF1bHRJdGVtKSB0aHJvdyBuZXcgUmVzb2x1dGlvbkVycm9yKGBJdGVtIG5vdCBmb3VuZCAtICR7Y3R4LmVudGl0eUlkfSAvICR7Y3R4LnJlc29sdmVyRnVsbFBhdGh9YCk7XG4gICAgICAgIHJldHVybiBhd2FpdCB2YXVsdEl0ZW0uZ2V0UmF3VmFsdWUodGhpcy52YXVsdEtleSEsIHRoaXMudmF1bHRLZXlOYW1lISk7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG59XG4iXSwiZmlsZSI6Ii9AZnMvVXNlcnMvdGhlby9kbW5vL2Rtbm8tcmVhY3Rpdml0eS9wYWNrYWdlcy9wbHVnaW5zL2VuY3J5cHRlZC12YXVsdC9kaXN0L2luZGV4LmpzIn0=
