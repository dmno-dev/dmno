// /Users/theo/dmno/dmno-reactivity/packages/plugins/1password/dist/index.js
const __vite_ssr_import_0__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["getResolverCtx"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["createDmnoDataType","DmnoBaseTypes","DmnoPlugin","ResolutionError","loadDotEnvIntoObject","SchemaError","ValidationError"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("child_process", {"importedNames":["spawnSync"]});
const __vite_ssr_import_3__ = await __vite_ssr_import__("lodash-es", {"importedNames":["default"]});
const __vite_ssr_import_4__ = await __vite_ssr_import__("kleur", {"importedNames":["default"]});
const __vite_ssr_import_5__ = await __vite_ssr_import__("@1password/sdk", {"importedNames":["createClient"]});







var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var ONEPASS_ICON = "simple-icons:1password";
var OnePasswordServiceAccountToken = __vite_ssr_import_1__.createDmnoDataType({
  typeLabel: "1password/service-account-token",
  extends: __vite_ssr_import_1__.DmnoBaseTypes.string({ startsWith: "ops_" }),
  exampleValue: "ops_a1B2c3...xyz",
  typeDescription: "Service account token used to authenticate with the [1Password CLI](https://developer.1password.com/docs/cli/get-started/) and [SDKs](https://developer.1password.com/docs/sdks/)",
  externalDocs: {
    description: "1password service accounts",
    url: "https://developer.1password.com/docs/service-accounts/"
  },
  ui: {
    icon: ONEPASS_ICON
  },
  sensitive: {
    redactMode: "show_last_2"
  }
});
var OnePasswordUUID = __vite_ssr_import_1__.createDmnoDataType({
  typeLabel: "1password/uuid",
  // NOTE - 1pass uuids are not quite matching any uuid spec so we won't fully validate them
  // but we can at least check the length and that it is alphanumeric
  extends: __vite_ssr_import_1__.DmnoBaseTypes.string({ isLength: 26, matches: /[a-z0-9]+/ }),
  typeDescription: "unique ID that identifies an object in 1password",
  externalDocs: {
    description: "1password concepts - unique identifiers",
    url: "https://developer.1password.com/docs/sdks/concepts#unique-identifiers"
  },
  ui: {
    icon: ONEPASS_ICON
  }
});
var OnePasswordVaultId = __vite_ssr_import_1__.createDmnoDataType({
  typeLabel: "1password/vault-id",
  extends: OnePasswordUUID,
  typeDescription: "unique ID that identifies an Vault in 1password",
  externalDocs: {
    description: "1password vault basics",
    url: "https://support.1password.com/create-share-vaults/"
  },
  ui: {
    icon: ONEPASS_ICON
  }
});
var OnePasswordItemId = __vite_ssr_import_1__.createDmnoDataType({
  typeLabel: "1password/item-id",
  extends: OnePasswordUUID,
  typeDescription: "unique ID that identifies an item in 1password",
  externalDocs: {
    description: "1password vault basics",
    url: "https://support.1password.com/create-share-vaults/"
  },
  ui: {
    icon: ONEPASS_ICON
  }
});
var OnePasswordSecretReferenceURI = __vite_ssr_import_1__.createDmnoDataType({
  typeLabel: "1password/secret-reference-uri",
  // we could add more validation...
  extends: __vite_ssr_import_1__.DmnoBaseTypes.string({
    startsWith: "op://",
    matches: /[a-z0-9-_./]+/
  }),
  exampleValue: "op://prod secrets/backend env vars/api",
  typeDescription: "uri that identifies a specific value within a 1password item - note that it is based on labels so not very stable",
  externalDocs: {
    description: "1password secret reference docs",
    url: "https://developer.1password.com/docs/cli/secrets-reference-syntax"
  },
  ui: {
    icon: ONEPASS_ICON
  }
});
var OnePasswordItemLink = __vite_ssr_import_1__.createDmnoDataType({
  typeLabel: "1password/item-link",
  extends: __vite_ssr_import_1__.DmnoBaseTypes.url({
    // TODO: add more validation
  }),
  exampleValue: "https://start.1password.com/open/i?a=ACCOUNTUUID&v=VAULTUUID&i=ITEMUUID&h=yourorg.1password.com",
  validate: /* @__PURE__ */ __name((val) => {
    if (!val.startsWith("https://start.1password.com/open/i?")) {
      throw new __vite_ssr_import_1__.ValidationError('1pass item url must start with "https://start.1password.com/open/i?"');
    }
    const url = new URL(val);
    if (!url.searchParams.get("v") || !url.searchParams.get("i")) {
      throw new __vite_ssr_import_1__.ValidationError('1pass item url is not complete - it must have item and vault ids"');
    }
  }, "validate"),
  typeDescription: "shareable url which opens to a specific item in 1password",
  externalDocs: {
    description: "1password private links",
    url: "https://support.1password.com/item-links/"
  },
  ui: {
    icon: ONEPASS_ICON
  }
});
var OnePasswordTypes = {
  serviceAccountToken: OnePasswordServiceAccountToken,
  uuid: OnePasswordUUID,
  vaultId: OnePasswordVaultId,
  itemId: OnePasswordItemId,
  secretReferenceUri: OnePasswordSecretReferenceURI,
  itemLink: OnePasswordItemLink
  // vaultName: OnePasswordVaultName,
};

// package.json
var name = "@dmno/1password-plugin";
var version = "0.0.5";

// src/plugin.ts
async function execOpCliCommand(cmdArgs) {
  const cmd = __vite_ssr_import_2__.spawnSync("op", cmdArgs);
  if (cmd.status === 0) {
    return cmd.stdout.toString();
  } else if (cmd.error) {
    if (cmd.error.code === "ENOENT") {
      throw new __vite_ssr_import_1__.ResolutionError("1password cli `op` not found", {
        tip: [
          "By not using a service account token, you are relying on your local 1password cli installation for ambient auth.",
          "But your local 1password cli (`op`) was not found. Install it here - https://developer.1password.com/docs/cli/get-started/"
        ]
      });
    } else {
      throw new __vite_ssr_import_1__.ResolutionError(`Problem invoking 1password cli: ${cmd.error.message}`);
    }
  } else {
    let errMessage = cmd.stderr.toString();
    console.log("1pass cli error", errMessage);
    if (errMessage.startsWith("[ERROR]")) errMessage = errMessage.substring(28);
    if (errMessage.includes("authorization prompt dismissed")) {
      throw new __vite_ssr_import_1__.ResolutionError("1password app authorization prompt dismissed by user", {
        tip: [
          "By not using a service account token, you are relying on your local 1password installation",
          "When the authorization prompt appears, you must authorize/unlock 1password to allow access"
        ]
      });
    } else if (errMessage.includes("isn't a vault in this account")) {
      throw new __vite_ssr_import_1__.ResolutionError("1password vault not found in account connected to op cli", {
        tip: [
          "By not using a service account token, you are relying on your local 1password cli installation and authentication.",
          "The account currently connected to the cli does not contain (or have access to) the selected vault",
          "This must be resolved in your terminal - try running `op whoami` to see which account is connected to your `op` cli.",
          "You may need to call `op signout` and `op signin` to select the correct account."
        ]
      });
    }
    if (!errMessage) {
      throw new __vite_ssr_import_1__.ResolutionError("1password cli not configured", {
        tip: [
          "By not using a service account token, you are relying on your local 1password cli installation and authentication.",
          "You many need to enable the 1password Desktop app integration, see https://developer.1password.com/docs/cli/get-started/#step-2-turn-on-the-1password-desktop-app-integration",
          "Try running `op whoami` to make sure the cli is connected to the correct account",
          "You may need to call `op signout` and `op signin` to select the correct account."
        ]
      });
    }
    throw new Error(`1password cli error - ${errMessage || "unknown"}`);
  }
}
__name(execOpCliCommand, "execOpCliCommand");
var OnePasswordDmnoPlugin = class _OnePasswordDmnoPlugin extends __vite_ssr_import_1__.DmnoPlugin {
  static {
    __name(this, "OnePasswordDmnoPlugin");
  }
  icon = "simple-icons:1password";
  // would be great to do this automatically as part of `DmnoPlugin` but I don't think it's possible
  // so instead we add some runtime checks in DmnoPlugin
  static pluginPackageName = name;
  static pluginPackageVersion = version;
  // this is likely the default for most plugins...
  // accept a mapping of how to fill inputs - each can be set to a
  // static value, config path, or use type-based injection
  // TODO: this is still not giving me types on the static input values... :(
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(instanceName, inputValues) {
    super(instanceName, {
      inputSchema: {
        token: {
          description: "this service account token will be used via the CLI to communicate with 1password",
          extends: OnePasswordTypes.serviceAccountToken,
          value: inputValues?.token
          // TODO: add validation, token must be set unless `fallbackToCliBasedAuth` is true
          // required: true,
        },
        envItemLink: {
          description: "link to secure note item containing dotenv style values",
          extends: OnePasswordTypes.itemLink,
          value: inputValues?.envItemLink
        },
        fallbackToCliBasedAuth: {
          description: "if token is empty, use system's `op` CLI to communicate with 1password",
          value: inputValues?.fallbackToCliBasedAuth
        }
      }
    });
  }
  opClient;
  async initOpClientIfNeeded() {
    const opServiceAccountToken = this.inputValue("token");
    if (!opServiceAccountToken) {
      if (!this.inputValue("fallbackToCliBasedAuth")) {
        throw new Error("Either a service account token must be provided, or you must enable `fallbackToCliBasedAuth`");
      }
      return;
    }
    if (!this.opClient) {
      this.opClient = await __vite_ssr_import_5__.createClient({
        auth: opServiceAccountToken,
        // TODO: figure out better way for this
        integrationName: _OnePasswordDmnoPlugin.pluginPackageName.replaceAll("@", "").replaceAll("/", " "),
        integrationVersion: _OnePasswordDmnoPlugin.pluginPackageVersion
      });
    }
  }
  async getOpItemById(ctx, vaultId, itemId) {
    await this.initOpClientIfNeeded();
    if (this.opClient) {
      return await ctx.getOrSetCacheItem(`1pass-sdk:V|${vaultId}/I|${itemId}`, async () => {
        try {
          const opItem = await this.opClient.items.get(vaultId, itemId);
          return JSON.parse(JSON.stringify(opItem));
        } catch (err) {
          if (__vite_ssr_import_3__.default.isString(err)) {
            if (err.includes("not a valid UUID")) {
              throw new __vite_ssr_import_1__.ResolutionError("Either the Vault ID or the item ID is not a valid UUID");
            } else if (err === "error when retrieving vault metadata: http error: unexpected http status: 404 Not Found") {
              throw new __vite_ssr_import_1__.ResolutionError(`Vault ID "${vaultId}" not found in this account`);
            } else if (err === "error when retrieving item details: http error: unexpected http status: 404 Not Found") {
              throw new __vite_ssr_import_1__.ResolutionError(`Item ID "${itemId}" not found within Vault ID "${vaultId}"`);
            }
            throw new __vite_ssr_import_1__.ResolutionError(`1password SDK error - ${err}`);
          }
          throw err;
        }
      });
    }
    return await ctx.getOrSetCacheItem(`1pass-cli:V|${vaultId}/I|${itemId}`, async () => {
      const itemJson = await execOpCliCommand([
        "item",
        "get",
        itemId,
        `--vault=${vaultId}`,
        "--format=json"
      ]);
      return JSON.parse(itemJson);
    });
  }
  async getOpItemByReference(ctx, referenceUrl) {
    await this.initOpClientIfNeeded();
    if (this.opClient) {
      try {
        return await ctx.getOrSetCacheItem(`1pass-sdk:R|${referenceUrl}`, async () => {
          return await this.opClient.secrets.resolve(referenceUrl);
        });
      } catch (err) {
        if (__vite_ssr_import_3__.default.isString(err)) {
          throw new __vite_ssr_import_1__.ResolutionError(`1password SDK error - ${err}`);
        }
        throw err;
      }
    }
    return await ctx.getOrSetCacheItem(`1pass-cli:R|${referenceUrl}`, async () => {
      return await execOpCliCommand([
        "read",
        referenceUrl,
        "--force",
        "--no-newline"
      ]);
    });
  }
  envItemsByService;
  async loadEnvItems(ctx) {
    const url = new URL(this.inputValue("envItemLink"));
    const vaultId = url.searchParams.get("v");
    const itemId = url.searchParams.get("i");
    const envItemsObj = await this.getOpItemById(ctx, vaultId, itemId);
    const loadedEnvByService = {};
    __vite_ssr_import_3__.default.each(envItemsObj.fields, (field) => {
      if (field.purpose === "NOTES") return;
      const serviceName = field.label || field.title;
      if (loadedEnvByService[serviceName]) {
        throw new __vite_ssr_import_1__.ResolutionError(`Duplicate service entries found in 1pass item - ${serviceName} `);
      }
      const dotEnvObj = __vite_ssr_import_1__.loadDotEnvIntoObject(field.value);
      loadedEnvByService[serviceName] = dotEnvObj;
    });
    this.envItemsByService = loadedEnvByService;
  }
  /**
   * resolver to fetch a 1password value from a .env blob within a text field.
   *
   * Plugin instance must be initialized with `envItemLink` input set to use this resolver.
   *
   * Items are looked up within the blob using their key
   *
   * @see https://dmno.dev/docs/plugins/1password/
   */
  item(overrideLookupKey) {
    return this.createResolver({
      label: /* @__PURE__ */ __name((ctx) => {
        return `env blob item > ${ctx.entityId} > ${overrideLookupKey || ctx.nodePath}`;
      }, "label"),
      resolve: /* @__PURE__ */ __name(async (ctx) => {
        if (!this.inputValue("envItemLink")) {
          throw new __vite_ssr_import_1__.SchemaError("You must set an `envItemLink` plugin input to use the .item() resolver");
        }
        if (!this.envItemsByService) await this.loadEnvItems(ctx);
        const lookupKey = overrideLookupKey || ctx.nodePath;
        const itemValue = this.envItemsByService?.[ctx.entityId]?.[lookupKey] || this.envItemsByService?._default?.[lookupKey];
        if (itemValue === void 0) {
          throw new __vite_ssr_import_1__.ResolutionError("Unable to find config item in 1password", {
            tip: [
              "Open the 1password item where your secrets are stored:",
              __vite_ssr_import_4__.default.gray(`\u{1F517} ${this.inputValue("envItemLink")}`),
              `Find entry with label ${__vite_ssr_import_4__.default.bold().cyan(ctx.entityId)} (or create it)`,
              "Add this secret like you would add it to a .env file",
              `For example: \`${lookupKey}="your-secret-value"\``
            ]
          });
        }
        return itemValue;
      }, "resolve")
    });
  }
  /**
   * resolver to fetch a 1password value using a "private link" and field ID
   *
   * To get an item's link, right click on the item and select `Copy Private Link` (or select the item and click the ellipses / more options menu)
   *
   * @see https://dmno.dev/docs/plugins/1password/
   * @see https://support.1password.com/item-links/
   */
  itemByLink(privateLink, fieldIdOrPath) {
    const linkValidationResult = OnePasswordTypes.itemLink().validate(privateLink);
    if (linkValidationResult !== true) {
      throw new __vite_ssr_import_1__.SchemaError(`Invalid item link - ${linkValidationResult[0].message}`);
    }
    const url = new URL(privateLink);
    const vaultId = url.searchParams.get("v");
    const itemId = url.searchParams.get("i");
    return this.itemById(vaultId, itemId, fieldIdOrPath);
  }
  /**
   * resolver to fetch a 1password value using UUIDs and a field ID
   *
   * @see https://dmno.dev/docs/plugins/1password/
   */
  itemById(vaultId, itemId, fieldIdOrPath) {
    const fieldId = __vite_ssr_import_3__.default.isString(fieldIdOrPath) ? fieldIdOrPath : void 0;
    const path = __vite_ssr_import_3__.default.isObject(fieldIdOrPath) ? fieldIdOrPath.path : void 0;
    return this.createResolver({
      label: /* @__PURE__ */ __name((ctx) => {
        return __vite_ssr_import_3__.default.compact([
          `Vault: ${vaultId}`,
          `Item: ${itemId}`,
          fieldId && `Field: ${fieldId}`,
          path && `Path: ${path}`
        ]).join(", ");
      }, "label"),
      resolve: /* @__PURE__ */ __name(async (ctx) => {
        const itemObj = await this.getOpItemById(ctx, vaultId, itemId);
        const sectionsById = __vite_ssr_import_3__.default.keyBy(itemObj.sections, (s) => s.id);
        if (fieldId !== void 0) {
          const field = __vite_ssr_import_3__.default.find(itemObj.fields, (f) => f.id === fieldId);
          if (field) {
            return field.value;
          }
          const possibleFieldIds = __vite_ssr_import_3__.default.compact(__vite_ssr_import_3__.default.map(itemObj.fields, (f) => {
            if (f.value === void 0 || f.value === "" || f.purpose === "NOTES") return void 0;
            const section = sectionsById[f.sectionId || f.section?.id];
            return { id: f.id, label: f.label || f.title, sectionLabel: section?.label || section?.title };
          }));
          throw new __vite_ssr_import_1__.ResolutionError(`Unable to find field ID "${fieldId}" in item`, {
            tip: [
              "Perhaps you meant one of",
              ...possibleFieldIds.map((f) => [
                "- ",
                f.sectionLabel ? `${f.sectionLabel} > ` : "",
                f.label,
                ` - ID = ${f.id}`
              ].join(""))
            ]
          });
        }
        if (path) {
          const valueAtPath = __vite_ssr_import_3__.default.find(itemObj.fields, (i) => {
            if (i.reference) {
              return i.reference.endsWith(path);
            } else {
              if (i.sectionId) return `${sectionsById[i.sectionId].title}/${i.title}` === path;
              else return i.title === path;
            }
          });
          if (!valueAtPath) {
            throw new Error(`Unable to resolve value at path ${path}`);
          }
          return valueAtPath.value;
        }
        throw new Error("Resolver must be passed a field ID or a path object");
      }, "resolve")
    });
  }
  /**
   * resolver to fetch a 1password value using a secret reference URI
   *
   * @see https://dmno.dev/docs/plugins/1password/
   * @see https://developer.1password.com/docs/cli/secret-reference-syntax
   */
  itemByReference(referenceUrl) {
    return this.createResolver({
      label: referenceUrl,
      resolve: /* @__PURE__ */ __name(async (ctx) => {
        const value = await this.getOpItemByReference(ctx, referenceUrl);
        if (value === void 0) {
          throw new __vite_ssr_import_1__.ResolutionError(`unable to resolve 1pass item - ${referenceUrl}`);
        }
        return value;
      }, "resolve")
    });
  }
};


Object.defineProperty(__vite_ssr_exports__, "OnePasswordDmnoPlugin", { enumerable: true, configurable: true, get(){ return OnePasswordDmnoPlugin }});
Object.defineProperty(__vite_ssr_exports__, "OnePasswordTypes", { enumerable: true, configurable: true, get(){ return OnePasswordTypes }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFBQTtBQW9CRTtBQUVBO0FBR0U7QUFBOEU7QUFHaEY7QUFDQTtBQUNBO0FBRUE7QUFBbUQ7QUFDckQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBZ0JFO0FBQ0E7QUFDQTtBQUEyQjtBQUV2QjtBQUFpQjtBQUNFO0FBQ0Y7QUFDYTtBQUNQO0FBQ1g7QUFOUDtBQVlMO0FBRUE7QUFHQTtBQUNFO0FBQ0E7QUFFRTtBQUFhO0FBR2Y7QUFDRTtBQUNBO0FBQ0E7QUFBNkY7QUFFL0Y7QUFBMEU7QUFDbkU7QUFDSDtBQUMrQjtBQUM3QjtBQUMwQztBQUN4QztBQUNhO0FBQ1A7QUFDWjtBQUNEO0FBR0g7QUFDRTtBQUVFO0FBRUU7QUFBZ0M7QUFHaEM7QUFBNEU7QUFDcEQ7QUFDMUI7QUFHRjtBQUNFO0FBQXlEO0FBRTNEO0FBQW1CO0FBRXJCO0FBQXFFO0FBcEQ5RDtBQXVEVjtBQUNIO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBbUJFO0FBQTJCO0FBQ2xCO0FBRUw7QUFJQTtBQUNFO0FBQTBFO0FBRTVFO0FBQU87QUFSQTtBQVVWO0FBRUwiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIi4uL3NyYy9kYXRhLXR5cGVzLnRzIiwiLi4vcGFja2FnZS5qc29uIiwiLi4vc3JjL3BsdWdpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEbW5vQmFzZVR5cGVzLCBWYWxpZGF0aW9uRXJyb3IsIGNyZWF0ZURtbm9EYXRhVHlwZSB9IGZyb20gJ2Rtbm8nO1xuXG5jb25zdCBPTkVQQVNTX0lDT04gPSAnc2ltcGxlLWljb25zOjFwYXNzd29yZCc7XG5cbmNvbnN0IE9uZVBhc3N3b3JkU2VydmljZUFjY291bnRUb2tlbiA9IGNyZWF0ZURtbm9EYXRhVHlwZSh7XG4gIHR5cGVMYWJlbDogJzFwYXNzd29yZC9zZXJ2aWNlLWFjY291bnQtdG9rZW4nLFxuICBleHRlbmRzOiBEbW5vQmFzZVR5cGVzLnN0cmluZyh7IHN0YXJ0c1dpdGg6ICdvcHNfJyB9KSxcbiAgZXhhbXBsZVZhbHVlOiAnb3BzX2ExQjJjMy4uLnh5eicsXG4gIHR5cGVEZXNjcmlwdGlvbjogJ1NlcnZpY2UgYWNjb3VudCB0b2tlbiB1c2VkIHRvIGF1dGhlbnRpY2F0ZSB3aXRoIHRoZSBbMVBhc3N3b3JkIENMSV0oaHR0cHM6Ly9kZXZlbG9wZXIuMXBhc3N3b3JkLmNvbS9kb2NzL2NsaS9nZXQtc3RhcnRlZC8pIGFuZCBbU0RLc10oaHR0cHM6Ly9kZXZlbG9wZXIuMXBhc3N3b3JkLmNvbS9kb2NzL3Nka3MvKScsXG4gIGV4dGVybmFsRG9jczoge1xuICAgIGRlc2NyaXB0aW9uOiAnMXBhc3N3b3JkIHNlcnZpY2UgYWNjb3VudHMnLFxuICAgIHVybDogJ2h0dHBzOi8vZGV2ZWxvcGVyLjFwYXNzd29yZC5jb20vZG9jcy9zZXJ2aWNlLWFjY291bnRzLycsXG4gIH0sXG4gIHVpOiB7XG4gICAgaWNvbjogT05FUEFTU19JQ09OLFxuICB9LFxuICBzZW5zaXRpdmU6IHtcbiAgICByZWRhY3RNb2RlOiAnc2hvd19sYXN0XzInLFxuICB9LFxufSk7XG5cbmNvbnN0IE9uZVBhc3N3b3JkVVVJRCA9IGNyZWF0ZURtbm9EYXRhVHlwZSh7XG4gIHR5cGVMYWJlbDogJzFwYXNzd29yZC91dWlkJyxcbiAgLy8gTk9URSAtIDFwYXNzIHV1aWRzIGFyZSBub3QgcXVpdGUgbWF0Y2hpbmcgYW55IHV1aWQgc3BlYyBzbyB3ZSB3b24ndCBmdWxseSB2YWxpZGF0ZSB0aGVtXG4gIC8vIGJ1dCB3ZSBjYW4gYXQgbGVhc3QgY2hlY2sgdGhlIGxlbmd0aCBhbmQgdGhhdCBpdCBpcyBhbHBoYW51bWVyaWNcbiAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5zdHJpbmcoeyBpc0xlbmd0aDogMjYsIG1hdGNoZXM6IC9bYS16MC05XSsvIH0pLFxuICB0eXBlRGVzY3JpcHRpb246ICd1bmlxdWUgSUQgdGhhdCBpZGVudGlmaWVzIGFuIG9iamVjdCBpbiAxcGFzc3dvcmQnLFxuICBleHRlcm5hbERvY3M6IHtcbiAgICBkZXNjcmlwdGlvbjogJzFwYXNzd29yZCBjb25jZXB0cyAtIHVuaXF1ZSBpZGVudGlmaWVycycsXG4gICAgdXJsOiAnaHR0cHM6Ly9kZXZlbG9wZXIuMXBhc3N3b3JkLmNvbS9kb2NzL3Nka3MvY29uY2VwdHMjdW5pcXVlLWlkZW50aWZpZXJzJyxcbiAgfSxcbiAgdWk6IHtcbiAgICBpY29uOiBPTkVQQVNTX0lDT04sXG4gIH0sXG59KTtcblxuY29uc3QgT25lUGFzc3dvcmRWYXVsdElkID0gY3JlYXRlRG1ub0RhdGFUeXBlKHtcbiAgdHlwZUxhYmVsOiAnMXBhc3N3b3JkL3ZhdWx0LWlkJyxcbiAgZXh0ZW5kczogT25lUGFzc3dvcmRVVUlELFxuICB0eXBlRGVzY3JpcHRpb246ICd1bmlxdWUgSUQgdGhhdCBpZGVudGlmaWVzIGFuIFZhdWx0IGluIDFwYXNzd29yZCcsXG4gIGV4dGVybmFsRG9jczoge1xuICAgIGRlc2NyaXB0aW9uOiAnMXBhc3N3b3JkIHZhdWx0IGJhc2ljcycsXG4gICAgdXJsOiAnaHR0cHM6Ly9zdXBwb3J0LjFwYXNzd29yZC5jb20vY3JlYXRlLXNoYXJlLXZhdWx0cy8nLFxuICB9LFxuICB1aToge1xuICAgIGljb246IE9ORVBBU1NfSUNPTixcbiAgfSxcbn0pO1xuY29uc3QgT25lUGFzc3dvcmRJdGVtSWQgPSBjcmVhdGVEbW5vRGF0YVR5cGUoe1xuICB0eXBlTGFiZWw6ICcxcGFzc3dvcmQvaXRlbS1pZCcsXG4gIGV4dGVuZHM6IE9uZVBhc3N3b3JkVVVJRCxcbiAgdHlwZURlc2NyaXB0aW9uOiAndW5pcXVlIElEIHRoYXQgaWRlbnRpZmllcyBhbiBpdGVtIGluIDFwYXNzd29yZCcsXG4gIGV4dGVybmFsRG9jczoge1xuICAgIGRlc2NyaXB0aW9uOiAnMXBhc3N3b3JkIHZhdWx0IGJhc2ljcycsXG4gICAgdXJsOiAnaHR0cHM6Ly9zdXBwb3J0LjFwYXNzd29yZC5jb20vY3JlYXRlLXNoYXJlLXZhdWx0cy8nLFxuICB9LFxuICB1aToge1xuICAgIGljb246IE9ORVBBU1NfSUNPTixcbiAgfSxcbn0pO1xuXG5jb25zdCBPbmVQYXNzd29yZFNlY3JldFJlZmVyZW5jZVVSSSA9IGNyZWF0ZURtbm9EYXRhVHlwZSh7XG4gIHR5cGVMYWJlbDogJzFwYXNzd29yZC9zZWNyZXQtcmVmZXJlbmNlLXVyaScsXG4gIC8vIHdlIGNvdWxkIGFkZCBtb3JlIHZhbGlkYXRpb24uLi5cbiAgZXh0ZW5kczogRG1ub0Jhc2VUeXBlcy5zdHJpbmcoe1xuICAgIHN0YXJ0c1dpdGg6ICdvcDovLycsXG4gICAgbWF0Y2hlczogL1thLXowLTktXy4vXSsvLFxuICB9KSxcbiAgZXhhbXBsZVZhbHVlOiAnb3A6Ly9wcm9kIHNlY3JldHMvYmFja2VuZCBlbnYgdmFycy9hcGknLFxuICB0eXBlRGVzY3JpcHRpb246ICd1cmkgdGhhdCBpZGVudGlmaWVzIGEgc3BlY2lmaWMgdmFsdWUgd2l0aGluIGEgMXBhc3N3b3JkIGl0ZW0gLSBub3RlIHRoYXQgaXQgaXMgYmFzZWQgb24gbGFiZWxzIHNvIG5vdCB2ZXJ5IHN0YWJsZScsXG4gIGV4dGVybmFsRG9jczoge1xuICAgIGRlc2NyaXB0aW9uOiAnMXBhc3N3b3JkIHNlY3JldCByZWZlcmVuY2UgZG9jcycsXG4gICAgdXJsOiAnaHR0cHM6Ly9kZXZlbG9wZXIuMXBhc3N3b3JkLmNvbS9kb2NzL2NsaS9zZWNyZXRzLXJlZmVyZW5jZS1zeW50YXgnLFxuICB9LFxuICB1aToge1xuICAgIGljb246IE9ORVBBU1NfSUNPTixcbiAgfSxcbn0pO1xuXG4vLyBleDogaHR0cHM6Ly9zdGFydC4xcGFzc3dvcmQuY29tL29wZW4vaT9hPUkzR1VBMktVNkJEM0ZCSEE0N1FOQklWRVY0JnY9dXQyZGZ0YWxtM3VnbXhjNmtsYXZtczZ0ZnEmaT1uNHdtZ2ZxNzdteWRnNWxlYnRyb2EzeWt2bSZoPWRtbm9pbmMuMXBhc3N3b3JkLmNvbVxuY29uc3QgT25lUGFzc3dvcmRJdGVtTGluayA9IGNyZWF0ZURtbm9EYXRhVHlwZSh7XG4gIHR5cGVMYWJlbDogJzFwYXNzd29yZC9pdGVtLWxpbmsnLFxuICBleHRlbmRzOiBEbW5vQmFzZVR5cGVzLnVybCh7XG4gICAgLy8gVE9ETzogYWRkIG1vcmUgdmFsaWRhdGlvblxuICB9KSxcbiAgZXhhbXBsZVZhbHVlOiAnaHR0cHM6Ly9zdGFydC4xcGFzc3dvcmQuY29tL29wZW4vaT9hPUFDQ09VTlRVVUlEJnY9VkFVTFRVVUlEJmk9SVRFTVVVSUQmaD15b3Vyb3JnLjFwYXNzd29yZC5jb20nLFxuICB2YWxpZGF0ZTogKHZhbCkgPT4ge1xuICAgIGlmICghdmFsLnN0YXJ0c1dpdGgoJ2h0dHBzOi8vc3RhcnQuMXBhc3N3b3JkLmNvbS9vcGVuL2k/JykpIHtcbiAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoJzFwYXNzIGl0ZW0gdXJsIG11c3Qgc3RhcnQgd2l0aCBcImh0dHBzOi8vc3RhcnQuMXBhc3N3b3JkLmNvbS9vcGVuL2k/XCInKTtcbiAgICB9XG4gICAgLy8gY3VycmVudGx5IHdlIG9ubHkgcmVhbGx5IG5lZWQgdGhlIHZhdWx0IGFuZCBpdGVtIGlkcywgc28gd2UncmUgb25seSBjaGVja2luZyBmb3IgdGhhdFxuICAgIC8vIGJ1dCB3ZSBjb3VsZCBjaGVjayBmb3IgdGhlIGZ1bGwgVVJMLi4uIHdlJ2xsIHNlZSBob3cgdGhpcyBnZXRzIHVzZWRcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHZhbCk7XG4gICAgaWYgKCF1cmwuc2VhcmNoUGFyYW1zLmdldCgndicpIHx8ICF1cmwuc2VhcmNoUGFyYW1zLmdldCgnaScpKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKCcxcGFzcyBpdGVtIHVybCBpcyBub3QgY29tcGxldGUgLSBpdCBtdXN0IGhhdmUgaXRlbSBhbmQgdmF1bHQgaWRzXCInKTtcbiAgICB9XG4gIH0sXG4gIHR5cGVEZXNjcmlwdGlvbjogJ3NoYXJlYWJsZSB1cmwgd2hpY2ggb3BlbnMgdG8gYSBzcGVjaWZpYyBpdGVtIGluIDFwYXNzd29yZCcsXG4gIGV4dGVybmFsRG9jczoge1xuICAgIGRlc2NyaXB0aW9uOiAnMXBhc3N3b3JkIHByaXZhdGUgbGlua3MnLFxuICAgIHVybDogJ2h0dHBzOi8vc3VwcG9ydC4xcGFzc3dvcmQuY29tL2l0ZW0tbGlua3MvJyxcbiAgfSxcbiAgdWk6IHtcbiAgICBpY29uOiBPTkVQQVNTX0lDT04sXG4gIH0sXG59KTtcblxuZXhwb3J0IGNvbnN0IE9uZVBhc3N3b3JkVHlwZXMgPSB7XG4gIHNlcnZpY2VBY2NvdW50VG9rZW46IE9uZVBhc3N3b3JkU2VydmljZUFjY291bnRUb2tlbixcbiAgdXVpZDogT25lUGFzc3dvcmRVVUlELFxuICB2YXVsdElkOiBPbmVQYXNzd29yZFZhdWx0SWQsXG4gIGl0ZW1JZDogT25lUGFzc3dvcmRJdGVtSWQsXG4gIHNlY3JldFJlZmVyZW5jZVVyaTogT25lUGFzc3dvcmRTZWNyZXRSZWZlcmVuY2VVUkksXG4gIGl0ZW1MaW5rOiBPbmVQYXNzd29yZEl0ZW1MaW5rLFxuICAvLyB2YXVsdE5hbWU6IE9uZVBhc3N3b3JkVmF1bHROYW1lLFxufTtcbiIsIntcbiAgXCJuYW1lXCI6IFwiQGRtbm8vMXBhc3N3b3JkLXBsdWdpblwiLFxuICBcInZlcnNpb25cIjogXCIwLjAuNVwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiZG1ubyBwbHVnaW4gdG8gcHVsbCBzZWNyZXRzIGZyb20gMXBhc3N3b3JkXCIsXG4gIFwiYXV0aG9yXCI6IFwiZG1uby1kZXZcIixcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJnaXQraHR0cHM6Ly9naXRodWIuY29tL2Rtbm8tZGV2L2Rtbm8uZ2l0XCIsXG4gICAgXCJkaXJlY3RvcnlcIjogXCJwYWNrYWdlcy9wbHVnaW5zLzFwYXNzd29yZFwiXG4gIH0sXG4gIFwiYnVnc1wiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9kbW5vLWRldi9kbW5vL2lzc3Vlc1wiLFxuICBcImhvbWVwYWdlXCI6IFwiaHR0cHM6Ly9kbW5vLmRldi9kb2NzL3BsdWdpbnMvMXBhc3N3b3JkXCIsXG4gIFwia2V5d29yZHNcIjogW1xuICAgIFwiZG1ub1wiLFxuICAgIFwiMXBhc3N3b3JkXCIsXG4gICAgXCJjb25maWdcIixcbiAgICBcImVudiB2YXJzXCIsXG4gICAgXCJlbnZpcm9ubWVudCB2YXJpYWJsZXNcIixcbiAgICBcInNlY3JldHNcIixcbiAgICBcImRtbm8tcGx1Z2luXCJcbiAgXSxcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwiZXhwb3J0c1wiOiB7XG4gICAgXCIuXCI6IHtcbiAgICAgIFwidHMtc3JjXCI6IFwiLi9zcmMvaW5kZXgudHNcIixcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L2luZGV4LmpzXCIsXG4gICAgICBcInR5cGVzXCI6IFwiLi9kaXN0L2luZGV4LmQudHNcIlxuICAgIH1cbiAgfSxcbiAgXCJmaWxlc1wiOiBbXG4gICAgXCIvZGlzdFwiXG4gIF0sXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJidWlsZFwiOiBcInRzdXBcIixcbiAgICBcImJ1aWxkOmlmbm9kaXN0XCI6IFwiWyAtZCBcXFwiLi9kaXN0XFxcIiBdICYmIGVjaG8gJ2Rpc3QgZXhpc3RzJyB8fCBwbnBtIGJ1aWxkXCIsXG4gICAgXCJkZXZcIjogXCJwbnBtIHJ1biBidWlsZCAtLXdhdGNoXCIsXG4gICAgXCJsaW50XCI6IFwiZXNsaW50IHNyYyAtLWV4dCAudHMsLmNqcywubWpzXCIsXG4gICAgXCJsaW50OmZpeFwiOiBcInBucG0gcnVuIGxpbnQgLS1maXhcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAZG1uby9lc2xpbnQtY29uZmlnXCI6IFwid29ya3NwYWNlOipcIixcbiAgICBcIkBkbW5vL3RzY29uZmlnXCI6IFwid29ya3NwYWNlOipcIixcbiAgICBcIkB0eXBlcy9hc3luY1wiOiBcIl4zLjIuMjRcIixcbiAgICBcIkB0eXBlcy9sb2Rhc2gtZXNcIjogXCJjYXRhbG9nOlwiLFxuICAgIFwiQHR5cGVzL25vZGVcIjogXCJjYXRhbG9nOlwiLFxuICAgIFwiQHR5cGVzL3VuemlwLXN0cmVhbVwiOiBcIl4wLjMuNFwiLFxuICAgIFwiZG1ub1wiOiBcIndvcmtzcGFjZToqXCIsXG4gICAgXCJ0c3VwXCI6IFwiY2F0YWxvZzpcIixcbiAgICBcInR5cGVzY3JpcHRcIjogXCJjYXRhbG9nOlwiXG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkAxcGFzc3dvcmQvc2RrXCI6IFwiXjAuMS4xXCIsXG4gICAgXCJhc3luY1wiOiBcIl4zLjIuNVwiLFxuICAgIFwia2xldXJcIjogXCJeNC4xLjVcIixcbiAgICBcImxvZGFzaC1lc1wiOiBcImNhdGFsb2c6XCIsXG4gICAgXCJ1bnppcC1zdHJlYW1cIjogXCJeMC4zLjFcIlxuICB9LFxuICBcInBlZXJEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiZG1ub1wiOiBcIl4wXCJcbiAgfVxufVxuIiwiaW1wb3J0IHsgc3Bhd25TeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gtZXMnO1xuaW1wb3J0IGtsZXVyIGZyb20gJ2tsZXVyJztcbmltcG9ydCB7XG4gIERtbm9QbHVnaW4sIFJlc29sdmVyQ29udGV4dCxcbiAgUmVzb2x1dGlvbkVycm9yLFxuICBTY2hlbWFFcnJvcixcbiAgbG9hZERvdEVudkludG9PYmplY3QsXG4gIFBsdWdpbklucHV0VmFsdWUsXG59IGZyb20gJ2Rtbm8nO1xuXG5pbXBvcnQgeyBDbGllbnQsIGNyZWF0ZUNsaWVudCB9IGZyb20gJ0AxcGFzc3dvcmQvc2RrJztcblxuaW1wb3J0IHsgbmFtZSBhcyB0aGlzUGFja2FnZU5hbWUsIHZlcnNpb24gYXMgdGhpc1BhY2thZ2VWZXJzaW9uIH0gZnJvbSAnLi4vcGFja2FnZS5qc29uJztcbmltcG9ydCB7IE9uZVBhc3N3b3JkVHlwZXMgfSBmcm9tICcuL2RhdGEtdHlwZXMnO1xuXG50eXBlIEZpZWxkSWQgPSBzdHJpbmc7XG50eXBlIEl0ZW1JZCA9IHN0cmluZztcbnR5cGUgVmF1bHRJZCA9IHN0cmluZztcbnR5cGUgVmF1bHROYW1lID0gc3RyaW5nO1xudHlwZSBSZWZlcmVuY2VVcmwgPSBzdHJpbmc7XG50eXBlIFNlcnZpY2VBY2NvdW50VG9rZW4gPSBzdHJpbmc7XG5cbmFzeW5jIGZ1bmN0aW9uIGV4ZWNPcENsaUNvbW1hbmQoY21kQXJnczogQXJyYXk8c3RyaW5nPikge1xuICAvLyB1c2luZyBzeXN0ZW0taW5zdGFsbGVkIGNvcHkgb2YgYG9wYFxuICBjb25zdCBjbWQgPSBzcGF3blN5bmMoJ29wJywgY21kQXJncyk7XG4gIGlmIChjbWQuc3RhdHVzID09PSAwKSB7XG4gICAgcmV0dXJuIGNtZC5zdGRvdXQudG9TdHJpbmcoKTtcbiAgfSBlbHNlIGlmIChjbWQuZXJyb3IpIHtcbiAgICBpZiAoKGNtZC5lcnJvciBhcyBhbnkpLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBuZXcgUmVzb2x1dGlvbkVycm9yKCcxcGFzc3dvcmQgY2xpIGBvcGAgbm90IGZvdW5kJywge1xuICAgICAgICB0aXA6IFtcbiAgICAgICAgICAnQnkgbm90IHVzaW5nIGEgc2VydmljZSBhY2NvdW50IHRva2VuLCB5b3UgYXJlIHJlbHlpbmcgb24geW91ciBsb2NhbCAxcGFzc3dvcmQgY2xpIGluc3RhbGxhdGlvbiBmb3IgYW1iaWVudCBhdXRoLicsXG4gICAgICAgICAgJ0J1dCB5b3VyIGxvY2FsIDFwYXNzd29yZCBjbGkgKGBvcGApIHdhcyBub3QgZm91bmQuIEluc3RhbGwgaXQgaGVyZSAtIGh0dHBzOi8vZGV2ZWxvcGVyLjFwYXNzd29yZC5jb20vZG9jcy9jbGkvZ2V0LXN0YXJ0ZWQvJyxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgUmVzb2x1dGlvbkVycm9yKGBQcm9ibGVtIGludm9raW5nIDFwYXNzd29yZCBjbGk6ICR7Y21kLmVycm9yLm1lc3NhZ2V9YCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxldCBlcnJNZXNzYWdlID0gY21kLnN0ZGVyci50b1N0cmluZygpO1xuICAgIC8vIGdldCByaWQgb2YgXCJbRVJST1JdIDIwMjQvMDEvMjMgMTI6MzQ6NTYgXCIgYmVmb3JlIGFjdHVhbCBtZXNzYWdlXG4gICAgY29uc29sZS5sb2coJzFwYXNzIGNsaSBlcnJvcicsIGVyck1lc3NhZ2UpO1xuICAgIGlmIChlcnJNZXNzYWdlLnN0YXJ0c1dpdGgoJ1tFUlJPUl0nKSkgZXJyTWVzc2FnZSA9IGVyck1lc3NhZ2Uuc3Vic3RyaW5nKDI4KTtcbiAgICBpZiAoZXJyTWVzc2FnZS5pbmNsdWRlcygnYXV0aG9yaXphdGlvbiBwcm9tcHQgZGlzbWlzc2VkJykpIHtcbiAgICAgIHRocm93IG5ldyBSZXNvbHV0aW9uRXJyb3IoJzFwYXNzd29yZCBhcHAgYXV0aG9yaXphdGlvbiBwcm9tcHQgZGlzbWlzc2VkIGJ5IHVzZXInLCB7XG4gICAgICAgIHRpcDogW1xuICAgICAgICAgICdCeSBub3QgdXNpbmcgYSBzZXJ2aWNlIGFjY291bnQgdG9rZW4sIHlvdSBhcmUgcmVseWluZyBvbiB5b3VyIGxvY2FsIDFwYXNzd29yZCBpbnN0YWxsYXRpb24nLFxuICAgICAgICAgICdXaGVuIHRoZSBhdXRob3JpemF0aW9uIHByb21wdCBhcHBlYXJzLCB5b3UgbXVzdCBhdXRob3JpemUvdW5sb2NrIDFwYXNzd29yZCB0byBhbGxvdyBhY2Nlc3MnLFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChlcnJNZXNzYWdlLmluY2x1ZGVzKFwiaXNuJ3QgYSB2YXVsdCBpbiB0aGlzIGFjY291bnRcIikpIHtcbiAgICAgIHRocm93IG5ldyBSZXNvbHV0aW9uRXJyb3IoJzFwYXNzd29yZCB2YXVsdCBub3QgZm91bmQgaW4gYWNjb3VudCBjb25uZWN0ZWQgdG8gb3AgY2xpJywge1xuICAgICAgICB0aXA6IFtcbiAgICAgICAgICAnQnkgbm90IHVzaW5nIGEgc2VydmljZSBhY2NvdW50IHRva2VuLCB5b3UgYXJlIHJlbHlpbmcgb24geW91ciBsb2NhbCAxcGFzc3dvcmQgY2xpIGluc3RhbGxhdGlvbiBhbmQgYXV0aGVudGljYXRpb24uJyxcbiAgICAgICAgICAnVGhlIGFjY291bnQgY3VycmVudGx5IGNvbm5lY3RlZCB0byB0aGUgY2xpIGRvZXMgbm90IGNvbnRhaW4gKG9yIGhhdmUgYWNjZXNzIHRvKSB0aGUgc2VsZWN0ZWQgdmF1bHQnLFxuICAgICAgICAgICdUaGlzIG11c3QgYmUgcmVzb2x2ZWQgaW4geW91ciB0ZXJtaW5hbCAtIHRyeSBydW5uaW5nIGBvcCB3aG9hbWlgIHRvIHNlZSB3aGljaCBhY2NvdW50IGlzIGNvbm5lY3RlZCB0byB5b3VyIGBvcGAgY2xpLicsXG4gICAgICAgICAgJ1lvdSBtYXkgbmVlZCB0byBjYWxsIGBvcCBzaWdub3V0YCBhbmQgYG9wIHNpZ25pbmAgdG8gc2VsZWN0IHRoZSBjb3JyZWN0IGFjY291bnQuJyxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyB3aGVuIHRoZSBkZXNrdG9wIGFwcCBpbnRlZ3JhdGlvbiBpcyBub3QgY29ubmVjdGVkLCBzb21lIGludGVyYWN0aXZlIENMSSBoZWxwIGlzIGRpc3BsYXllZFxuICAgIC8vIGhvd2V2ZXIgaWYgaXQgZGlzbWlzc2VkLCB3ZSBnZXQgYW4gZXJyb3Igd2l0aCBubyBtZXNzYWdlXG4gICAgLy8gVE9ETzogZmlndXJlIG91dCB0aGUgcmlnaHQgd29ya2Zsb3cgaGVyZT9cbiAgICBpZiAoIWVyck1lc3NhZ2UpIHtcbiAgICAgIHRocm93IG5ldyBSZXNvbHV0aW9uRXJyb3IoJzFwYXNzd29yZCBjbGkgbm90IGNvbmZpZ3VyZWQnLCB7XG4gICAgICAgIHRpcDogW1xuICAgICAgICAgICdCeSBub3QgdXNpbmcgYSBzZXJ2aWNlIGFjY291bnQgdG9rZW4sIHlvdSBhcmUgcmVseWluZyBvbiB5b3VyIGxvY2FsIDFwYXNzd29yZCBjbGkgaW5zdGFsbGF0aW9uIGFuZCBhdXRoZW50aWNhdGlvbi4nLFxuICAgICAgICAgICdZb3UgbWFueSBuZWVkIHRvIGVuYWJsZSB0aGUgMXBhc3N3b3JkIERlc2t0b3AgYXBwIGludGVncmF0aW9uLCBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIuMXBhc3N3b3JkLmNvbS9kb2NzL2NsaS9nZXQtc3RhcnRlZC8jc3RlcC0yLXR1cm4tb24tdGhlLTFwYXNzd29yZC1kZXNrdG9wLWFwcC1pbnRlZ3JhdGlvbicsXG4gICAgICAgICAgJ1RyeSBydW5uaW5nIGBvcCB3aG9hbWlgIHRvIG1ha2Ugc3VyZSB0aGUgY2xpIGlzIGNvbm5lY3RlZCB0byB0aGUgY29ycmVjdCBhY2NvdW50JyxcbiAgICAgICAgICAnWW91IG1heSBuZWVkIHRvIGNhbGwgYG9wIHNpZ25vdXRgIGFuZCBgb3Agc2lnbmluYCB0byBzZWxlY3QgdGhlIGNvcnJlY3QgYWNjb3VudC4nLFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKGAxcGFzc3dvcmQgY2xpIGVycm9yIC0gJHtlcnJNZXNzYWdlIHx8ICd1bmtub3duJ31gKTtcbiAgfVxufVxuXG4vLyBUeXBlc2NyaXB0IGhhcyBzb21lIGxpbWl0YXRpb25zIGFyb3VuZCBnZW5lcmljcyBhbmQgaG93IHRoaW5ncyB3b3JrIGFjcm9zcyBwYXJlbnQvY2hpbGQgY2xhc3Nlc1xuLy8gc28gdW5mb3J0dW5hdGVseSwgd2UgaGF2ZSB0byBhZGQgc29tZSBleHRyYSB0eXBlIGFubm90YXRpb25zLCBidXQgaXQncyBub3QgdG9vIGJhZFxuLy8gc2VlIGlzc3Vlczpcbi8vIC0gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zNjY3XG4vLyAtIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMTM3M1xuLy8gLSBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzIzOTExXG4vLyBleHBvcnQgY2xhc3MgT25lUGFzc3dvcmREbW5vUGx1Z2luIGV4dGVuZHMgRG1ub1BsdWdpbjxcbi8vIHR5cGVvZiBPbmVQYXNzd29yZERtbm9QbHVnaW4uaW5wdXRTY2hlbWEsIHR5cGVvZiBPbmVQYXNzd29yZERtbm9QbHVnaW4uSU5QVVRfVFlQRVNcbi8vID4ge1xuXG5cbi8qKlxuICogRE1OTyBwbHVnaW4gdG8gcmV0cmlldmUgc2VjcmV0cyBmcm9tIDFQYXNzd29yZFxuICpcbiAqIEBzZWUgaHR0cHM6Ly9kbW5vLmRldi9kb2NzL3BsdWdpbnMvMXBhc3N3b3JkL1xuICovXG5leHBvcnQgY2xhc3MgT25lUGFzc3dvcmREbW5vUGx1Z2luIGV4dGVuZHMgRG1ub1BsdWdpbiB7XG4gIGljb24gPSAnc2ltcGxlLWljb25zOjFwYXNzd29yZCc7XG5cbiAgLy8gd291bGQgYmUgZ3JlYXQgdG8gZG8gdGhpcyBhdXRvbWF0aWNhbGx5IGFzIHBhcnQgb2YgYERtbm9QbHVnaW5gIGJ1dCBJIGRvbid0IHRoaW5rIGl0J3MgcG9zc2libGVcbiAgLy8gc28gaW5zdGVhZCB3ZSBhZGQgc29tZSBydW50aW1lIGNoZWNrcyBpbiBEbW5vUGx1Z2luXG4gIHN0YXRpYyBwbHVnaW5QYWNrYWdlTmFtZSA9IHRoaXNQYWNrYWdlTmFtZTtcbiAgc3RhdGljIHBsdWdpblBhY2thZ2VWZXJzaW9uID0gdGhpc1BhY2thZ2VWZXJzaW9uO1xuXG4gIC8vIHRoaXMgaXMgbGlrZWx5IHRoZSBkZWZhdWx0IGZvciBtb3N0IHBsdWdpbnMuLi5cbiAgLy8gYWNjZXB0IGEgbWFwcGluZyBvZiBob3cgdG8gZmlsbCBpbnB1dHMgLSBlYWNoIGNhbiBiZSBzZXQgdG8gYVxuICAvLyBzdGF0aWMgdmFsdWUsIGNvbmZpZyBwYXRoLCBvciB1c2UgdHlwZS1iYXNlZCBpbmplY3Rpb25cbiAgLy8gVE9ETzogdGhpcyBpcyBzdGlsbCBub3QgZ2l2aW5nIG1lIHR5cGVzIG9uIHRoZSBzdGF0aWMgaW5wdXQgdmFsdWVzLi4uIDooXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdXNlbGVzcy1jb25zdHJ1Y3RvclxuICBjb25zdHJ1Y3RvcihcbiAgICBpbnN0YW5jZU5hbWU6IHN0cmluZyxcbiAgICBpbnB1dFZhbHVlcz86IHtcbiAgICAgIHRva2VuOiBQbHVnaW5JbnB1dFZhbHVlLFxuICAgICAgZW52SXRlbUxpbms/OiBzdHJpbmcsXG4gICAgICBmYWxsYmFja1RvQ2xpQmFzZWRBdXRoPzogYm9vbGVhbixcbiAgICB9LFxuICApIHtcbiAgICBzdXBlcihpbnN0YW5jZU5hbWUsIHtcbiAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgIHRva2VuOiB7XG4gICAgICAgICAgZGVzY3JpcHRpb246ICd0aGlzIHNlcnZpY2UgYWNjb3VudCB0b2tlbiB3aWxsIGJlIHVzZWQgdmlhIHRoZSBDTEkgdG8gY29tbXVuaWNhdGUgd2l0aCAxcGFzc3dvcmQnLFxuICAgICAgICAgIGV4dGVuZHM6IE9uZVBhc3N3b3JkVHlwZXMuc2VydmljZUFjY291bnRUb2tlbixcbiAgICAgICAgICB2YWx1ZTogaW5wdXRWYWx1ZXM/LnRva2VuLFxuICAgICAgICAgIC8vIFRPRE86IGFkZCB2YWxpZGF0aW9uLCB0b2tlbiBtdXN0IGJlIHNldCB1bmxlc3MgYGZhbGxiYWNrVG9DbGlCYXNlZEF1dGhgIGlzIHRydWVcbiAgICAgICAgICAvLyByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgZW52SXRlbUxpbms6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ2xpbmsgdG8gc2VjdXJlIG5vdGUgaXRlbSBjb250YWluaW5nIGRvdGVudiBzdHlsZSB2YWx1ZXMnLFxuICAgICAgICAgIGV4dGVuZHM6IE9uZVBhc3N3b3JkVHlwZXMuaXRlbUxpbmssXG4gICAgICAgICAgdmFsdWU6IGlucHV0VmFsdWVzPy5lbnZJdGVtTGluayxcbiAgICAgICAgfSxcbiAgICAgICAgZmFsbGJhY2tUb0NsaUJhc2VkQXV0aDoge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOiBcImlmIHRva2VuIGlzIGVtcHR5LCB1c2Ugc3lzdGVtJ3MgYG9wYCBDTEkgdG8gY29tbXVuaWNhdGUgd2l0aCAxcGFzc3dvcmRcIixcbiAgICAgICAgICB2YWx1ZTogaW5wdXRWYWx1ZXM/LmZhbGxiYWNrVG9DbGlCYXNlZEF1dGgsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBvcENsaWVudDogQ2xpZW50IHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIGFzeW5jIGluaXRPcENsaWVudElmTmVlZGVkKCkge1xuICAgIGNvbnN0IG9wU2VydmljZUFjY291bnRUb2tlbiA9IHRoaXMuaW5wdXRWYWx1ZSgndG9rZW4nKTtcbiAgICBpZiAoIW9wU2VydmljZUFjY291bnRUb2tlbikge1xuICAgICAgaWYgKCF0aGlzLmlucHV0VmFsdWUoJ2ZhbGxiYWNrVG9DbGlCYXNlZEF1dGgnKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0VpdGhlciBhIHNlcnZpY2UgYWNjb3VudCB0b2tlbiBtdXN0IGJlIHByb3ZpZGVkLCBvciB5b3UgbXVzdCBlbmFibGUgYGZhbGxiYWNrVG9DbGlCYXNlZEF1dGhgJyk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghdGhpcy5vcENsaWVudCkge1xuICAgICAgdGhpcy5vcENsaWVudCA9IGF3YWl0IGNyZWF0ZUNsaWVudCh7XG4gICAgICAgIGF1dGg6IG9wU2VydmljZUFjY291bnRUb2tlbiBhcyBzdHJpbmcsIC8vIFRPRE86IGZpZ3VyZSBvdXQgYmV0dGVyIHdheSBmb3IgdGhpc1xuICAgICAgICBpbnRlZ3JhdGlvbk5hbWU6IE9uZVBhc3N3b3JkRG1ub1BsdWdpbi5wbHVnaW5QYWNrYWdlTmFtZS5yZXBsYWNlQWxsKCdAJywgJycpLnJlcGxhY2VBbGwoJy8nLCAnICcpLFxuICAgICAgICBpbnRlZ3JhdGlvblZlcnNpb246IE9uZVBhc3N3b3JkRG1ub1BsdWdpbi5wbHVnaW5QYWNrYWdlVmVyc2lvbixcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0T3BJdGVtQnlJZChjdHg6IFJlc29sdmVyQ29udGV4dCwgdmF1bHRJZDogVmF1bHRJZCwgaXRlbUlkOiBJdGVtSWQpOiBQcm9taXNlPGFueT4ge1xuICAgIGF3YWl0IHRoaXMuaW5pdE9wQ2xpZW50SWZOZWVkZWQoKTtcbiAgICAvLyB1c2luZyBzZGtcbiAgICBpZiAodGhpcy5vcENsaWVudCkge1xuICAgICAgcmV0dXJuIGF3YWl0IGN0eC5nZXRPclNldENhY2hlSXRlbShgMXBhc3Mtc2RrOlZ8JHt2YXVsdElkfS9JfCR7aXRlbUlkfWAsIGFzeW5jICgpID0+IHtcbiAgICAgICAgLy8gVE9ETzogYmV0dGVyIGVycm9yIGhhbmRsaW5nIHRvIHRlbGwgeW91IHdoYXQgd2VudCB3cm9uZz8gbm8gYWNjZXNzLCBub24gZXhpc3RhbnQsIGV0Y1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG9wSXRlbSA9IGF3YWl0IHRoaXMub3BDbGllbnQhLml0ZW1zLmdldCh2YXVsdElkLCBpdGVtSWQpO1xuICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9wSXRlbSkpOyAvLyBjb252ZXJ0IHRvIHBsYWluIG9iamVjdFxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAvLyAxcGFzcyBzZGsgdGhyb3dzIHN0cmluZ3MgYXMgZXJyb3JzLi4uXG4gICAgICAgICAgaWYgKF8uaXNTdHJpbmcoZXJyKSkge1xuICAgICAgICAgICAgaWYgKGVyci5pbmNsdWRlcygnbm90IGEgdmFsaWQgVVVJRCcpKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBSZXNvbHV0aW9uRXJyb3IoJ0VpdGhlciB0aGUgVmF1bHQgSUQgb3IgdGhlIGl0ZW0gSUQgaXMgbm90IGEgdmFsaWQgVVVJRCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlcnIgPT09ICdlcnJvciB3aGVuIHJldHJpZXZpbmcgdmF1bHQgbWV0YWRhdGE6IGh0dHAgZXJyb3I6IHVuZXhwZWN0ZWQgaHR0cCBzdGF0dXM6IDQwNCBOb3QgRm91bmQnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBSZXNvbHV0aW9uRXJyb3IoYFZhdWx0IElEIFwiJHt2YXVsdElkfVwiIG5vdCBmb3VuZCBpbiB0aGlzIGFjY291bnRgKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXJyID09PSAnZXJyb3Igd2hlbiByZXRyaWV2aW5nIGl0ZW0gZGV0YWlsczogaHR0cCBlcnJvcjogdW5leHBlY3RlZCBodHRwIHN0YXR1czogNDA0IE5vdCBGb3VuZCcpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFJlc29sdXRpb25FcnJvcihgSXRlbSBJRCBcIiR7aXRlbUlkfVwiIG5vdCBmb3VuZCB3aXRoaW4gVmF1bHQgSUQgXCIke3ZhdWx0SWR9XCJgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG5ldyBSZXNvbHV0aW9uRXJyb3IoYDFwYXNzd29yZCBTREsgZXJyb3IgLSAke2Vycn1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gdXNpbmcgY2xpXG4gICAgcmV0dXJuIGF3YWl0IGN0eC5nZXRPclNldENhY2hlSXRlbShgMXBhc3MtY2xpOlZ8JHt2YXVsdElkfS9JfCR7aXRlbUlkfWAsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGl0ZW1Kc29uID0gYXdhaXQgZXhlY09wQ2xpQ29tbWFuZChbXG4gICAgICAgICdpdGVtJywgJ2dldCcsIGl0ZW1JZCxcbiAgICAgICAgYC0tdmF1bHQ9JHt2YXVsdElkfWAsXG4gICAgICAgICctLWZvcm1hdD1qc29uJyxcbiAgICAgIF0pO1xuICAgICAgcmV0dXJuIEpTT04ucGFyc2UoaXRlbUpzb24pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRPcEl0ZW1CeVJlZmVyZW5jZShjdHg6IFJlc29sdmVyQ29udGV4dCwgcmVmZXJlbmNlVXJsOiBSZWZlcmVuY2VVcmwpIHtcbiAgICBhd2FpdCB0aGlzLmluaXRPcENsaWVudElmTmVlZGVkKCk7XG4gICAgLy8gdXNpbmcgc2RrXG4gICAgaWYgKHRoaXMub3BDbGllbnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBhd2FpdCBjdHguZ2V0T3JTZXRDYWNoZUl0ZW0oYDFwYXNzLXNkazpSfCR7cmVmZXJlbmNlVXJsfWAsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAvLyBUT0RPOiBiZXR0ZXIgZXJyb3IgaGFuZGxpbmcgdG8gdGVsbCB5b3Ugd2hhdCB3ZW50IHdyb25nPyBubyBhY2Nlc3MsIG5vbiBleGlzdGFudCwgZXRjXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub3BDbGllbnQhLnNlY3JldHMucmVzb2x2ZShyZWZlcmVuY2VVcmwpO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyAxcGFzcyBzZGsgdGhyb3dzIHN0cmluZ3MgYXMgZXJyb3JzLi4uXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKGVycikpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUmVzb2x1dGlvbkVycm9yKGAxcGFzc3dvcmQgU0RLIGVycm9yIC0gJHtlcnJ9YCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyB1c2luZyBvcCBDTElcbiAgICByZXR1cm4gYXdhaXQgY3R4LmdldE9yU2V0Q2FjaGVJdGVtKGAxcGFzcy1jbGk6Unwke3JlZmVyZW5jZVVybH1gLCBhc3luYyAoKSA9PiB7XG4gICAgICByZXR1cm4gYXdhaXQgZXhlY09wQ2xpQ29tbWFuZChbXG4gICAgICAgICdyZWFkJywgcmVmZXJlbmNlVXJsLFxuICAgICAgICAnLS1mb3JjZScsXG4gICAgICAgICctLW5vLW5ld2xpbmUnLFxuICAgICAgXSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGVudkl0ZW1zQnlTZXJ2aWNlOiBSZWNvcmQ8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhc3luYyBsb2FkRW52SXRlbXMoY3R4OiBSZXNvbHZlckNvbnRleHQpIHtcbiAgICAvLyB3ZSd2ZSBhbHJlYWR5IHZhbGlkYXRlZCB0aGUgdXJsIGlzIGdvb2QgYW5kIGluY2x1ZGVzIHRoZSBxdWVyeSBwYXJhbXNcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHRoaXMuaW5wdXRWYWx1ZSgnZW52SXRlbUxpbmsnKSEpO1xuICAgIGNvbnN0IHZhdWx0SWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgndicpITtcbiAgICBjb25zdCBpdGVtSWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnaScpITtcblxuICAgIGNvbnN0IGVudkl0ZW1zT2JqID0gYXdhaXQgdGhpcy5nZXRPcEl0ZW1CeUlkKGN0eCwgdmF1bHRJZCwgaXRlbUlkKTtcblxuICAgIGNvbnN0IGxvYWRlZEVudkJ5U2VydmljZTogdHlwZW9mIHRoaXMuZW52SXRlbXNCeVNlcnZpY2UgPSB7fTtcbiAgICBfLmVhY2goZW52SXRlbXNPYmouZmllbGRzLCAoZmllbGQpID0+IHtcbiAgICAgIGlmIChmaWVsZC5wdXJwb3NlID09PSAnTk9URVMnKSByZXR1cm47XG4gICAgICAvLyB0aGUgXCJkZWZhdWx0XCIgaXRlbXMgb24gYSBzZWN1cmUgbm90ZSBnZXQgYWRkZWQgdG8gYW4gaW52aXNpYmxlIFwiYWRkIG1vcmVcIiBzZWN0aW9uXG4gICAgICAvLyB3ZSBjb3VsZCBmb3JjZSB1c2VycyB0byBvbmx5IGFkZCBpbiB0aGVyZT8gYnV0IGl0IG1pZ2h0IGdldCBjb25mdXNpbmcuLi4/XG4gICAgICBjb25zdCBzZXJ2aWNlTmFtZSA9IGZpZWxkLmxhYmVsIHx8IGZpZWxkLnRpdGxlOyAvLyBjbGkgdXNlcyBcImxhYmVsXCIsIHNkayB1c2VzIFwidGl0bGVcIlxuXG4gICAgICAvLyBtYWtlIHN1cmUgd2UgZG9udCBoYXZlIGEgZHVwbGljYXRlXG4gICAgICBpZiAobG9hZGVkRW52QnlTZXJ2aWNlW3NlcnZpY2VOYW1lXSkge1xuICAgICAgICB0aHJvdyBuZXcgUmVzb2x1dGlvbkVycm9yKGBEdXBsaWNhdGUgc2VydmljZSBlbnRyaWVzIGZvdW5kIGluIDFwYXNzIGl0ZW0gLSAke3NlcnZpY2VOYW1lfSBgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRvdEVudk9iaiA9IGxvYWREb3RFbnZJbnRvT2JqZWN0KGZpZWxkLnZhbHVlKTtcbiAgICAgIGxvYWRlZEVudkJ5U2VydmljZVtzZXJ2aWNlTmFtZV0gPSBkb3RFbnZPYmo7XG4gICAgICAvLyBUT0RPOiBkZWFsIHdpdGggbmVzdGVkIG9iamVjdHMgLS0gYXJlIHBhdGhzIFwiLlwiIG9yIFwiX19cIj9cbiAgICAgIC8vIFRPRE86IGRvIHdlIHdhbnQgdG8gYWxsb3cgb3RoZXIgZm9ybWF0cz9cbiAgICB9KTtcbiAgICB0aGlzLmVudkl0ZW1zQnlTZXJ2aWNlID0gbG9hZGVkRW52QnlTZXJ2aWNlO1xuICB9XG5cblxuICAvKipcbiAgICogcmVzb2x2ZXIgdG8gZmV0Y2ggYSAxcGFzc3dvcmQgdmFsdWUgZnJvbSBhIC5lbnYgYmxvYiB3aXRoaW4gYSB0ZXh0IGZpZWxkLlxuICAgKlxuICAgKiBQbHVnaW4gaW5zdGFuY2UgbXVzdCBiZSBpbml0aWFsaXplZCB3aXRoIGBlbnZJdGVtTGlua2AgaW5wdXQgc2V0IHRvIHVzZSB0aGlzIHJlc29sdmVyLlxuICAgKlxuICAgKiBJdGVtcyBhcmUgbG9va2VkIHVwIHdpdGhpbiB0aGUgYmxvYiB1c2luZyB0aGVpciBrZXlcbiAgICpcbiAgICogQHNlZSBodHRwczovL2Rtbm8uZGV2L2RvY3MvcGx1Z2lucy8xcGFzc3dvcmQvXG4gICAqL1xuICBpdGVtKFxuICAgIC8qKlxuICAgICAqIG9wdGlvbmFsbHkgb3ZlcnJpZGUgdGhlIGtleSB1c2VkIHRvIGxvb2sgdXAgdGhlIGl0ZW0gd2l0aGluIHRoZSBkb3RlbnYgYmxvYlxuICAgICAqXG4gICAgICogX25vdCBvZnRlbiBuZWNlc3NhcnkhX1xuICAgICAqICovXG4gICAgb3ZlcnJpZGVMb29rdXBLZXk/OiBzdHJpbmcsXG4gICkge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZVJlc29sdmVyKHtcbiAgICAgIGxhYmVsOiAoY3R4KSA9PiB7XG4gICAgICAgIHJldHVybiBgZW52IGJsb2IgaXRlbSA+ICR7Y3R4LmVudGl0eUlkfSA+ICR7b3ZlcnJpZGVMb29rdXBLZXkgfHwgY3R4Lm5vZGVQYXRofWA7XG4gICAgICB9LFxuICAgICAgcmVzb2x2ZTogYXN5bmMgKGN0eCkgPT4ge1xuICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIHVzZXIgaGFzIG1hcHBlZCB1cCBhbiBpbnB1dCBmb3Igd2hlcmUgdGhlIGVudiBkYXRhIGlzIHN0b3JlZFxuICAgICAgICBpZiAoISh0aGlzLmlucHV0VmFsdWUoJ2Vudkl0ZW1MaW5rJykgYXMgYW55KSkge1xuICAgICAgICAgIHRocm93IG5ldyBTY2hlbWFFcnJvcignWW91IG11c3Qgc2V0IGFuIGBlbnZJdGVtTGlua2AgcGx1Z2luIGlucHV0IHRvIHVzZSB0aGUgLml0ZW0oKSByZXNvbHZlcicpO1xuICAgICAgICB9XG5cblxuICAgICAgICBpZiAoIXRoaXMuZW52SXRlbXNCeVNlcnZpY2UpIGF3YWl0IHRoaXMubG9hZEVudkl0ZW1zKGN0eCk7XG5cbiAgICAgICAgY29uc3QgbG9va3VwS2V5ID0gb3ZlcnJpZGVMb29rdXBLZXkgfHwgY3R4Lm5vZGVQYXRoO1xuXG4gICAgICAgIGNvbnN0IGl0ZW1WYWx1ZSA9IHRoaXMuZW52SXRlbXNCeVNlcnZpY2U/LltjdHguZW50aXR5SWQhXT8uW2xvb2t1cEtleV1cbiAgICAgICAgICAvLyB0aGUgbGFiZWwgXCJfZGVmYXVsdFwiIGlzIHVzZWQgdG8gc2lnbmFsIGEgZmFsbGJhY2sgLyBkZWZhdWx0IHRvIGFwcGx5IHRvIGFsbCBzZXJ2aWNlc1xuICAgICAgICAgIHx8IHRoaXMuZW52SXRlbXNCeVNlcnZpY2U/Ll9kZWZhdWx0Py5bbG9va3VwS2V5XTtcblxuICAgICAgICBpZiAoaXRlbVZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUmVzb2x1dGlvbkVycm9yKCdVbmFibGUgdG8gZmluZCBjb25maWcgaXRlbSBpbiAxcGFzc3dvcmQnLCB7XG4gICAgICAgICAgICB0aXA6IFtcbiAgICAgICAgICAgICAgJ09wZW4gdGhlIDFwYXNzd29yZCBpdGVtIHdoZXJlIHlvdXIgc2VjcmV0cyBhcmUgc3RvcmVkOicsXG4gICAgICAgICAgICAgIGtsZXVyLmdyYXkoYPCflJcgJHt0aGlzLmlucHV0VmFsdWUoJ2Vudkl0ZW1MaW5rJyl9YCksXG4gICAgICAgICAgICAgIGBGaW5kIGVudHJ5IHdpdGggbGFiZWwgJHtrbGV1ci5ib2xkKCkuY3lhbihjdHguZW50aXR5SWQhKX0gKG9yIGNyZWF0ZSBpdClgLFxuICAgICAgICAgICAgICAnQWRkIHRoaXMgc2VjcmV0IGxpa2UgeW91IHdvdWxkIGFkZCBpdCB0byBhIC5lbnYgZmlsZScsXG4gICAgICAgICAgICAgIGBGb3IgZXhhbXBsZTogXFxgJHtsb29rdXBLZXl9PVwieW91ci1zZWNyZXQtdmFsdWVcIlxcYGAsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETzogYWRkIG1ldGFkYXRhIHNvIHlvdSBrbm93IGlmIGl0IGNhbWUgZnJvbSBhIHNlcnZpY2Ugb3IgKiBpdGVtXG4gICAgICAgIHJldHVybiBpdGVtVmFsdWU7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIHJlc29sdmVyIHRvIGZldGNoIGEgMXBhc3N3b3JkIHZhbHVlIHVzaW5nIGEgXCJwcml2YXRlIGxpbmtcIiBhbmQgZmllbGQgSURcbiAgICpcbiAgICogVG8gZ2V0IGFuIGl0ZW0ncyBsaW5rLCByaWdodCBjbGljayBvbiB0aGUgaXRlbSBhbmQgc2VsZWN0IGBDb3B5IFByaXZhdGUgTGlua2AgKG9yIHNlbGVjdCB0aGUgaXRlbSBhbmQgY2xpY2sgdGhlIGVsbGlwc2VzIC8gbW9yZSBvcHRpb25zIG1lbnUpXG4gICAqXG4gICAqIEBzZWUgaHR0cHM6Ly9kbW5vLmRldi9kb2NzL3BsdWdpbnMvMXBhc3N3b3JkL1xuICAgKiBAc2VlIGh0dHBzOi8vc3VwcG9ydC4xcGFzc3dvcmQuY29tL2l0ZW0tbGlua3MvXG4gICAqL1xuICBpdGVtQnlMaW5rKFxuICAgIC8qKlxuICAgICAqIDFwYXNzd29yZCBpdGVtIF9Qcml2YXRlIExpbmtfXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSBcImh0dHBzOi8vc3RhcnQuMXBhc3N3b3JkLmNvbS9vcGVuL2k/YT0uLi5cIlxuICAgICAqL1xuICAgIHByaXZhdGVMaW5rOiBzdHJpbmcsXG4gICAgLyoqIDFwYXNzd29yZCBJdGVtIEZpZWxkIElEIChvciBwYXRoKSAqL1xuICAgIGZpZWxkSWRPclBhdGg6IEZpZWxkSWQgfCB7IHBhdGg6IHN0cmluZyB9LFxuICApIHtcbiAgICBjb25zdCBsaW5rVmFsaWRhdGlvblJlc3VsdCA9IE9uZVBhc3N3b3JkVHlwZXMuaXRlbUxpbmsoKS52YWxpZGF0ZShwcml2YXRlTGluayk7XG5cbiAgICBpZiAobGlua1ZhbGlkYXRpb25SZXN1bHQgIT09IHRydWUpIHtcbiAgICAgIC8vIFRPRE86IGFkZCBsaW5rIHRvIHBsdWdpbiBkb2NzXG4gICAgICAvLyBUT0RPOiB0aHJvd2luZyBhbiBlcnJvciBoZXJlIGNhdXNlcyBwcm9ibGVtcywgbmVlZCBhIGRpZmZlcmVudCBwYXR0ZXJuIHRvIHBhc3MgYWxvbmcgdGhlIGVycm9yIHdpdGhvdXQgZXhwbG9kaW5nXG4gICAgICB0aHJvdyBuZXcgU2NoZW1hRXJyb3IoYEludmFsaWQgaXRlbSBsaW5rIC0gJHtsaW5rVmFsaWRhdGlvblJlc3VsdFswXS5tZXNzYWdlfWApO1xuICAgIH1cblxuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocHJpdmF0ZUxpbmspO1xuICAgIGNvbnN0IHZhdWx0SWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgndicpITtcbiAgICBjb25zdCBpdGVtSWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnaScpITtcblxuICAgIHJldHVybiB0aGlzLml0ZW1CeUlkKHZhdWx0SWQsIGl0ZW1JZCwgZmllbGRJZE9yUGF0aCk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiByZXNvbHZlciB0byBmZXRjaCBhIDFwYXNzd29yZCB2YWx1ZSB1c2luZyBVVUlEcyBhbmQgYSBmaWVsZCBJRFxuICAgKlxuICAgKiBAc2VlIGh0dHBzOi8vZG1uby5kZXYvZG9jcy9wbHVnaW5zLzFwYXNzd29yZC9cbiAgICovXG4gIGl0ZW1CeUlkKFxuICAgIC8qKiAxcGFzc3dvcmQgVmF1bHQgVVVJRCAqL1xuICAgIHZhdWx0SWQ6IFZhdWx0SWQsXG4gICAgLyoqIDFwYXNzd29yZCBJdGVtIFVVSUQgKi9cbiAgICBpdGVtSWQ6IEl0ZW1JZCxcbiAgICAvKiogMXBhc3N3b3JkIEl0ZW0gRmllbGQgaWQgKG9yIHBhdGgpICovXG4gICAgZmllbGRJZE9yUGF0aDogRmllbGRJZCB8IHsgcGF0aDogc3RyaW5nIH0sXG4gICkge1xuICAgIGNvbnN0IGZpZWxkSWQgPSBfLmlzU3RyaW5nKGZpZWxkSWRPclBhdGgpID8gZmllbGRJZE9yUGF0aCA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBwYXRoID0gXy5pc09iamVjdChmaWVsZElkT3JQYXRoKSA/IGZpZWxkSWRPclBhdGgucGF0aCA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGVSZXNvbHZlcih7XG4gICAgICBsYWJlbDogKGN0eCkgPT4ge1xuICAgICAgICByZXR1cm4gXy5jb21wYWN0KFtcbiAgICAgICAgICBgVmF1bHQ6ICR7dmF1bHRJZH1gLFxuICAgICAgICAgIGBJdGVtOiAke2l0ZW1JZH1gLFxuICAgICAgICAgIGZpZWxkSWQgJiYgYEZpZWxkOiAke2ZpZWxkSWR9YCxcbiAgICAgICAgICBwYXRoICYmIGBQYXRoOiAke3BhdGh9YCxcbiAgICAgICAgXSkuam9pbignLCAnKTtcbiAgICAgIH0sXG4gICAgICByZXNvbHZlOiBhc3luYyAoY3R4KSA9PiB7XG4gICAgICAgIC8vIHdlJ3ZlIGFscmVhZHkgY2hlY2tlZCB0aGF0IHRoZSBkZWZhdWx0VmF1bHRJZCBpcyBzZXQgYWJvdmUgaWYgaXQncyBuZWVkZWRcbiAgICAgICAgLy8gYW5kIHRoZSBwbHVnaW4gd2lsbCBoYXZlIGEgc2NoZW1hIGVycm9yIGlmIHRoZSByZXNvbHV0aW9uIGZhaWxlZFxuXG4gICAgICAgIGNvbnN0IGl0ZW1PYmogPSBhd2FpdCB0aGlzLmdldE9wSXRlbUJ5SWQoY3R4LCB2YXVsdElkLCBpdGVtSWQpO1xuXG4gICAgICAgIGNvbnN0IHNlY3Rpb25zQnlJZCA9IF8ua2V5QnkoaXRlbU9iai5zZWN0aW9ucywgKHMpID0+IHMuaWQpO1xuXG4gICAgICAgIC8vIGZpZWxkIHNlbGVjdGlvbiBieSBpZFxuICAgICAgICBpZiAoZmllbGRJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29uc3QgZmllbGQgPSBfLmZpbmQoaXRlbU9iai5maWVsZHMsIChmKSA9PiBmLmlkID09PSBmaWVsZElkKTtcbiAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgIC8vIGRvIHdlIHdhbnQgdG8gdGhyb3cgYW4gZXJyb3IgaWYgd2UgZm91bmQgdGhlIHZhbHVlIGJ1dCBpdHMgZW1wdHk/XG4gICAgICAgICAgICByZXR1cm4gZmllbGQudmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGl0ZW1PYmopO1xuICAgICAgICAgIGNvbnN0IHBvc3NpYmxlRmllbGRJZHMgPSBfLmNvbXBhY3QoXy5tYXAoaXRlbU9iai5maWVsZHMsIChmKSA9PiB7XG4gICAgICAgICAgICBpZiAoZi52YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IGYudmFsdWUgPT09ICcnIHx8IGYucHVycG9zZSA9PT0gJ05PVEVTJykgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbnN0IHNlY3Rpb24gPSBzZWN0aW9uc0J5SWRbZi5zZWN0aW9uSWQgfHwgZi5zZWN0aW9uPy5pZF07XG4gICAgICAgICAgICByZXR1cm4geyBpZDogZi5pZCwgbGFiZWw6IGYubGFiZWwgfHwgZi50aXRsZSwgc2VjdGlvbkxhYmVsOiBzZWN0aW9uPy5sYWJlbCB8fCBzZWN0aW9uPy50aXRsZSB9O1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgICB0aHJvdyBuZXcgUmVzb2x1dGlvbkVycm9yKGBVbmFibGUgdG8gZmluZCBmaWVsZCBJRCBcIiR7ZmllbGRJZH1cIiBpbiBpdGVtYCwge1xuICAgICAgICAgICAgdGlwOiBbXG4gICAgICAgICAgICAgICdQZXJoYXBzIHlvdSBtZWFudCBvbmUgb2YnLFxuICAgICAgICAgICAgICAuLi5wb3NzaWJsZUZpZWxkSWRzLm1hcCgoZikgPT4gW1xuICAgICAgICAgICAgICAgICctICcsXG4gICAgICAgICAgICAgICAgZi5zZWN0aW9uTGFiZWwgPyBgJHtmLnNlY3Rpb25MYWJlbH0gPiBgIDogJycsXG4gICAgICAgICAgICAgICAgZi5sYWJlbCxcbiAgICAgICAgICAgICAgICBgIC0gSUQgPSAke2YuaWR9YCxcbiAgICAgICAgICAgICAgXS5qb2luKCcnKSksXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZpZWxkIHNlbGVjdGlvbiBieSBwYXRoXG4gICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgY29uc3QgdmFsdWVBdFBhdGggPSBfLmZpbmQoaXRlbU9iai5maWVsZHMsIChpKSA9PiB7XG4gICAgICAgICAgICAvLyB1c2luZyB0aGUgY2xpLCBlYWNoIGl0ZW0gaGFzIHRoZSByZWZlcmVuY2UgaW5jbHVkZWRcbiAgICAgICAgICAgIGlmIChpLnJlZmVyZW5jZSkge1xuICAgICAgICAgICAgICAvLyBUT0RPOiBjaGVja2luZyB0aGUgcmVmZXJlbmNlIGVuZGluZyBpcyBuYWl2ZS4uLlxuICAgICAgICAgICAgICByZXR1cm4gaS5yZWZlcmVuY2UuZW5kc1dpdGgocGF0aCk7XG4gICAgICAgICAgICAvLyB1c2luZyB0aGUgc2RrLCB3ZSBoYXZlIHRvIGF3a3dhcmRseSByZWNvbnN0cnVjdCBpdFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKGkuc2VjdGlvbklkKSByZXR1cm4gYCR7c2VjdGlvbnNCeUlkW2kuc2VjdGlvbklkXS50aXRsZX0vJHtpLnRpdGxlfWAgPT09IHBhdGg7XG4gICAgICAgICAgICAgIGVsc2UgcmV0dXJuIGkudGl0bGUgPT09IHBhdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoIXZhbHVlQXRQYXRoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byByZXNvbHZlIHZhbHVlIGF0IHBhdGggJHtwYXRofWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsdWVBdFBhdGgudmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXNvbHZlciBtdXN0IGJlIHBhc3NlZCBhIGZpZWxkIElEIG9yIGEgcGF0aCBvYmplY3QnKTtcbiAgICAgICAgLy8gc2hvdWxkIHdlIGZhbGxiYWNrIHRvIGZpcnN0IGl0ZW0gb3I/XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cblxuICAvKipcbiAgICogcmVzb2x2ZXIgdG8gZmV0Y2ggYSAxcGFzc3dvcmQgdmFsdWUgdXNpbmcgYSBzZWNyZXQgcmVmZXJlbmNlIFVSSVxuICAgKlxuICAgKiBAc2VlIGh0dHBzOi8vZG1uby5kZXYvZG9jcy9wbHVnaW5zLzFwYXNzd29yZC9cbiAgICogQHNlZSBodHRwczovL2RldmVsb3Blci4xcGFzc3dvcmQuY29tL2RvY3MvY2xpL3NlY3JldC1yZWZlcmVuY2Utc3ludGF4XG4gICAqL1xuICBpdGVtQnlSZWZlcmVuY2UoXG4gICAgLyoqXG4gICAgICogMVBhc3N3b3JkIHNlY3JldCByZWZlcmVuY2UgVVJJIG9mIHRoZSBzZWNyZXQgdmFsdWVcbiAgICAgKlxuICAgICAqIPCfk5oge0BsaW5rIGh0dHBzOi8vZGV2ZWxvcGVyLjFwYXNzd29yZC5jb20vZG9jcy9jbGkvc2VjcmV0LXJlZmVyZW5jZS1zeW50YXgvI2dldC1zZWNyZXQtcmVmZXJlbmNlcyB8IDFQYXNzd29yZCBkb2NzIH1cbiAgICAgKi9cbiAgICByZWZlcmVuY2VVcmw6IFJlZmVyZW5jZVVybCxcbiAgKSB7XG4gICAgLy8gVE9ETzogdmFsaWRhdGUgdGhlIHJlZmVyZW5jZSB1cmwgbG9va3Mgb2s/XG5cbiAgICByZXR1cm4gdGhpcy5jcmVhdGVSZXNvbHZlcih7XG4gICAgICBsYWJlbDogcmVmZXJlbmNlVXJsLFxuICAgICAgcmVzb2x2ZTogYXN5bmMgKGN0eCkgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IHRoaXMuZ2V0T3BJdGVtQnlSZWZlcmVuY2UoY3R4LCByZWZlcmVuY2VVcmwpO1xuXG4gICAgICAgIC8vIFRPRE86IGJldHRlciBlcnJvciBoYW5kbGluZyB0byB0ZWxsIHlvdSB3aGF0IHdlbnQgd3Jvbmc/IG5vIGFjY2Vzcywgbm9uIGV4aXN0YW50LCBldGNcblxuICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRocm93IG5ldyBSZXNvbHV0aW9uRXJyb3IoYHVuYWJsZSB0byByZXNvbHZlIDFwYXNzIGl0ZW0gLSAke3JlZmVyZW5jZVVybH1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG59XG4iXSwiZmlsZSI6Ii9AZnMvVXNlcnMvdGhlby9kbW5vL2Rtbm8tcmVhY3Rpdml0eS9wYWNrYWdlcy9wbHVnaW5zLzFwYXNzd29yZC9kaXN0L2luZGV4LmpzIn0=
