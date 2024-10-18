// /Users/theo/dmno/dmno-reactivity/packages/plugins/encrypted-vault/dist/chunk-ZJOMMXAU.js
const __vite_ssr_import_0__ = await __vite_ssr_import__("/node_modules/dmno/dist/index.js", {"importedNames":["getResolverCtx"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("crypto", {"importedNames":["default"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("base64-arraybuffer");




var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var KEY_EXPORT_FORMAT = "jwk";
var ENCRYPTION_ALGO = "AES-GCM";
var IV_LENGTH = 12;
var KEY_USAGES = ["encrypt", "decrypt"];
var KEY_SPLIT_SEP = "//";
async function generateEncryptionKeyString() {
  const key = await __vite_ssr_import_1__.default.subtle.generateKey(
    { name: ENCRYPTION_ALGO, length: 256 },
    true,
    KEY_USAGES
  );
  const exportableKey = await __vite_ssr_import_1__.default.subtle.exportKey(KEY_EXPORT_FORMAT, key);
  return exportableKey.k;
}
__name(generateEncryptionKeyString, "generateEncryptionKeyString");
async function importEncryptionKey(keyData) {
  return __vite_ssr_import_1__.default.subtle.importKey(
    KEY_EXPORT_FORMAT,
    keyData,
    ENCRYPTION_ALGO,
    true,
    KEY_USAGES
  );
}
__name(importEncryptionKey, "importEncryptionKey");
async function importEncryptionKeyString(keyStr) {
  return importEncryptionKey({
    key_ops: KEY_USAGES,
    ext: true,
    kty: "oct",
    k: keyStr,
    alg: "A256GCM"
  });
}
__name(importEncryptionKeyString, "importEncryptionKeyString");
async function generateDmnoEncryptionKeyString(keyName) {
  if (keyName.includes(KEY_SPLIT_SEP)) {
    throw new Error(`dmno encryption key name must not include separator "${KEY_SPLIT_SEP}"`);
  }
  const key = await generateEncryptionKeyString();
  return `dmno${KEY_SPLIT_SEP}${keyName}${KEY_SPLIT_SEP}${key}`;
}
__name(generateDmnoEncryptionKeyString, "generateDmnoEncryptionKeyString");
async function importDmnoEncryptionKeyString(dmnoKeyStr) {
  if (!dmnoKeyStr) {
    throw new Error("dmno encryption key must not be empty");
  }
  if (!dmnoKeyStr.startsWith(`dmno${KEY_SPLIT_SEP}`)) {
    throw new Error(`dmno keys must start with dmno${KEY_SPLIT_SEP}`);
  }
  const [, keyName, keyStr] = dmnoKeyStr.split(KEY_SPLIT_SEP);
  if (!keyStr) throw new Error("dmno keys must have a key name");
  const cryptoKey = await importEncryptionKeyString(keyStr);
  return { key: cryptoKey, keyName };
}
__name(importDmnoEncryptionKeyString, "importDmnoEncryptionKeyString");
async function encrypt(key, rawValue, additionalData) {
  const nonce = __vite_ssr_import_1__.default.randomBytes(IV_LENGTH);
  const encryptedData = await __vite_ssr_import_1__.default.subtle.encrypt(
    {
      name: ENCRYPTION_ALGO,
      iv: nonce,
      tagLength: 128,
      // ?
      ...additionalData && { additionalData: Buffer.from(additionalData, "base64") }
    },
    key,
    new TextEncoder().encode(JSON.stringify(rawValue))
  );
  const ivWithData = new Uint8Array(
    Array.from(nonce).concat(Array.from(new Uint8Array(encryptedData)))
  );
  const encryptedStr = __vite_ssr_import_2__.encode(ivWithData);
  return encryptedStr;
}
__name(encrypt, "encrypt");
async function decrypt(key, base64EncryptedVal, additionalData) {
  const nonceCiphertextTag = new Uint8Array(__vite_ssr_import_2__.decode(base64EncryptedVal));
  const decryptionNonce = nonceCiphertextTag.subarray(0, IV_LENGTH);
  const ciphertextTag = nonceCiphertextTag.subarray(IV_LENGTH);
  const decrypted = await __vite_ssr_import_1__.default.subtle.decrypt({
    name: ENCRYPTION_ALGO,
    iv: decryptionNonce,
    ...additionalData && { additionalData: Buffer.from(additionalData, "base64") }
  }, key, ciphertextTag);
  const decryptedStr = new TextDecoder().decode(decrypted);
  const decryptedValue = JSON.parse(decryptedStr);
  return decryptedValue;
}
__name(decrypt, "decrypt");


Object.defineProperty(__vite_ssr_exports__, "__name", { enumerable: true, configurable: true, get(){ return __name }});
Object.defineProperty(__vite_ssr_exports__, "decrypt", { enumerable: true, configurable: true, get(){ return decrypt }});
Object.defineProperty(__vite_ssr_exports__, "encrypt", { enumerable: true, configurable: true, get(){ return encrypt }});
Object.defineProperty(__vite_ssr_exports__, "generateDmnoEncryptionKeyString", { enumerable: true, configurable: true, get(){ return generateDmnoEncryptionKeyString }});
Object.defineProperty(__vite_ssr_exports__, "importDmnoEncryptionKeyString", { enumerable: true, configurable: true, get(){ return importDmnoEncryptionKeyString }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQTs7Ozs7Ozs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0U7QUFBZ0M7QUFDTztBQUNyQztBQUNBO0FBRUY7QUFDQTtBQUNGO0FBUnNCO0FBVXRCO0FBQ0U7QUFBcUI7QUFDbkI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVKO0FBUnNCO0FBU3RCO0FBQ0U7QUFBMkI7QUFDaEI7QUFDSjtBQUNBO0FBQ0Y7QUFDRTtBQUVUO0FBUnNCO0FBV3RCO0FBQ0U7QUFDRTtBQUF3RjtBQUUxRjtBQUNBO0FBQ0Y7QUFOc0I7QUFRdEI7QUFDRTtBQUNFO0FBQXVEO0FBRXpEO0FBQ0U7QUFBZ0U7QUFFbEU7QUFDQTtBQUVBO0FBRUE7QUFDRjtBQWJzQjtBQWV0QjtBQUNFO0FBRUE7QUFBMEM7QUFDeEM7QUFDUTtBQUNGO0FBQ087QUFBQTtBQUNrRTtBQUMvRTtBQUNBO0FBQ2lEO0FBRW5EO0FBQXVCO0FBQzZDO0FBRXBFO0FBQ0E7QUFDRjtBQWxCc0I7QUFxQnRCO0FBQ0U7QUFDQTtBQUNBO0FBRUE7QUFBOEM7QUFDdEM7QUFDRjtBQUN5RTtBQUcvRTtBQUNBO0FBQ0E7QUFDRjtBQWRzQiIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiLi4vLi4vLi4vZW5jcnlwdGlvbi1saWIvc3JjL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcnlwdG8sIHsgSnNvbldlYktleSB9IGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCAqIGFzIGI2NGFiIGZyb20gJ2Jhc2U2NC1hcnJheWJ1ZmZlcic7XG5cbmNvbnN0IEtFWV9FWFBPUlRfRk9STUFUID0gJ2p3ayc7XG5jb25zdCBFTkNSWVBUSU9OX0FMR08gPSAnQUVTLUdDTSc7XG5jb25zdCBJVl9MRU5HVEggPSAxMjsgLy8gRm9yIEdDTSBhIG5vbmNlIGxlbmd0aCBvZiAxMiBieXRlcyBpcyByZWNvbW1lbmRlZCFcbmNvbnN0IEtFWV9VU0FHRVMgPSBbJ2VuY3J5cHQnLCAnZGVjcnlwdCddIGFzIGNvbnN0O1xuY29uc3QgS0VZX1NQTElUX1NFUCA9ICcvLyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZUVuY3J5cHRpb25LZXlTdHJpbmcoKSB7XG4gIGNvbnN0IGtleSA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZ2VuZXJhdGVLZXkoXG4gICAgeyBuYW1lOiBFTkNSWVBUSU9OX0FMR08sIGxlbmd0aDogMjU2IH0sXG4gICAgdHJ1ZSxcbiAgICBLRVlfVVNBR0VTLFxuICApO1xuICBjb25zdCBleHBvcnRhYmxlS2V5ID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5leHBvcnRLZXkoS0VZX0VYUE9SVF9GT1JNQVQsIGtleSk7XG4gIHJldHVybiBleHBvcnRhYmxlS2V5LmshO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW1wb3J0RW5jcnlwdGlvbktleShrZXlEYXRhOiBKc29uV2ViS2V5KSB7XG4gIHJldHVybiBjcnlwdG8uc3VidGxlLmltcG9ydEtleShcbiAgICBLRVlfRVhQT1JUX0ZPUk1BVCxcbiAgICBrZXlEYXRhLFxuICAgIEVOQ1JZUFRJT05fQUxHTyxcbiAgICB0cnVlLFxuICAgIEtFWV9VU0FHRVMsXG4gICk7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW1wb3J0RW5jcnlwdGlvbktleVN0cmluZyhrZXlTdHI6IHN0cmluZykge1xuICByZXR1cm4gaW1wb3J0RW5jcnlwdGlvbktleSh7XG4gICAga2V5X29wczogS0VZX1VTQUdFUyxcbiAgICBleHQ6IHRydWUsXG4gICAga3R5OiAnb2N0JyxcbiAgICBrOiBrZXlTdHIsXG4gICAgYWxnOiAnQTI1NkdDTScsXG4gIH0pO1xufVxuXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZURtbm9FbmNyeXB0aW9uS2V5U3RyaW5nKGtleU5hbWU6IHN0cmluZykge1xuICBpZiAoa2V5TmFtZS5pbmNsdWRlcyhLRVlfU1BMSVRfU0VQKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgZG1ubyBlbmNyeXB0aW9uIGtleSBuYW1lIG11c3Qgbm90IGluY2x1ZGUgc2VwYXJhdG9yIFwiJHtLRVlfU1BMSVRfU0VQfVwiYCk7XG4gIH1cbiAgY29uc3Qga2V5ID0gYXdhaXQgZ2VuZXJhdGVFbmNyeXB0aW9uS2V5U3RyaW5nKCk7XG4gIHJldHVybiBgZG1ubyR7S0VZX1NQTElUX1NFUH0ke2tleU5hbWV9JHtLRVlfU1BMSVRfU0VQfSR7a2V5fWA7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbXBvcnREbW5vRW5jcnlwdGlvbktleVN0cmluZyhkbW5vS2V5U3RyOiBzdHJpbmcpIHtcbiAgaWYgKCFkbW5vS2V5U3RyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdkbW5vIGVuY3J5cHRpb24ga2V5IG11c3Qgbm90IGJlIGVtcHR5Jyk7XG4gIH1cbiAgaWYgKCFkbW5vS2V5U3RyLnN0YXJ0c1dpdGgoYGRtbm8ke0tFWV9TUExJVF9TRVB9YCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGRtbm8ga2V5cyBtdXN0IHN0YXJ0IHdpdGggZG1ubyR7S0VZX1NQTElUX1NFUH1gKTtcbiAgfVxuICBjb25zdCBbLGtleU5hbWUsIGtleVN0cl0gPSBkbW5vS2V5U3RyLnNwbGl0KEtFWV9TUExJVF9TRVApO1xuICBpZiAoIWtleVN0cikgdGhyb3cgbmV3IEVycm9yKCdkbW5vIGtleXMgbXVzdCBoYXZlIGEga2V5IG5hbWUnKTtcblxuICBjb25zdCBjcnlwdG9LZXkgPSBhd2FpdCBpbXBvcnRFbmNyeXB0aW9uS2V5U3RyaW5nKGtleVN0cik7XG5cbiAgcmV0dXJuIHsga2V5OiBjcnlwdG9LZXksIGtleU5hbWUgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuY3J5cHQoa2V5OiBjcnlwdG8ud2ViY3J5cHRvLkNyeXB0b0tleSwgcmF3VmFsdWU6IGFueSwgYWRkaXRpb25hbERhdGE/OiBzdHJpbmcpIHtcbiAgY29uc3Qgbm9uY2UgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoSVZfTEVOR1RIKTtcblxuICBjb25zdCBlbmNyeXB0ZWREYXRhID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5lbmNyeXB0KFxuICAgIHtcbiAgICAgIG5hbWU6IEVOQ1JZUFRJT05fQUxHTyxcbiAgICAgIGl2OiBub25jZSxcbiAgICAgIHRhZ0xlbmd0aDogMTI4LCAvLyA/XG4gICAgICAuLi5hZGRpdGlvbmFsRGF0YSAmJiB7IGFkZGl0aW9uYWxEYXRhOiBCdWZmZXIuZnJvbShhZGRpdGlvbmFsRGF0YSwgJ2Jhc2U2NCcpIH0sXG4gICAgfSxcbiAgICBrZXksXG4gICAgbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKEpTT04uc3RyaW5naWZ5KHJhd1ZhbHVlKSksXG4gICk7XG4gIGNvbnN0IGl2V2l0aERhdGEgPSBuZXcgVWludDhBcnJheShcbiAgICBBcnJheS5mcm9tKG5vbmNlKS5jb25jYXQoQXJyYXkuZnJvbShuZXcgVWludDhBcnJheShlbmNyeXB0ZWREYXRhKSkpLFxuICApO1xuICBjb25zdCBlbmNyeXB0ZWRTdHIgPSBiNjRhYi5lbmNvZGUoaXZXaXRoRGF0YSk7XG4gIHJldHVybiBlbmNyeXB0ZWRTdHI7XG59XG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlY3J5cHQoa2V5OiBjcnlwdG8ud2ViY3J5cHRvLkNyeXB0b0tleSwgYmFzZTY0RW5jcnlwdGVkVmFsOiBzdHJpbmcsIGFkZGl0aW9uYWxEYXRhPzogc3RyaW5nKSB7XG4gIGNvbnN0IG5vbmNlQ2lwaGVydGV4dFRhZyA9IG5ldyBVaW50OEFycmF5KGI2NGFiLmRlY29kZShiYXNlNjRFbmNyeXB0ZWRWYWwpKTtcbiAgY29uc3QgZGVjcnlwdGlvbk5vbmNlID0gbm9uY2VDaXBoZXJ0ZXh0VGFnLnN1YmFycmF5KDAsIElWX0xFTkdUSCk7XG4gIGNvbnN0IGNpcGhlcnRleHRUYWcgPSBub25jZUNpcGhlcnRleHRUYWcuc3ViYXJyYXkoSVZfTEVOR1RIKTtcblxuICBjb25zdCBkZWNyeXB0ZWQgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmRlY3J5cHQoe1xuICAgIG5hbWU6IEVOQ1JZUFRJT05fQUxHTyxcbiAgICBpdjogZGVjcnlwdGlvbk5vbmNlLFxuICAgIC4uLmFkZGl0aW9uYWxEYXRhICYmIHsgYWRkaXRpb25hbERhdGE6IEJ1ZmZlci5mcm9tKGFkZGl0aW9uYWxEYXRhLCAnYmFzZTY0JykgfSxcbiAgfSwga2V5LCBjaXBoZXJ0ZXh0VGFnKTtcblxuICBjb25zdCBkZWNyeXB0ZWRTdHIgPSBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoZGVjcnlwdGVkKTtcbiAgY29uc3QgZGVjcnlwdGVkVmFsdWUgPSBKU09OLnBhcnNlKGRlY3J5cHRlZFN0cik7XG4gIHJldHVybiBkZWNyeXB0ZWRWYWx1ZTtcbn1cblxuIl0sImZpbGUiOiIvQGZzL1VzZXJzL3RoZW8vZG1uby9kbW5vLXJlYWN0aXZpdHkvcGFja2FnZXMvcGx1Z2lucy9lbmNyeXB0ZWQtdmF1bHQvZGlzdC9jaHVuay1aSk9NTVhBVS5qcyJ9
