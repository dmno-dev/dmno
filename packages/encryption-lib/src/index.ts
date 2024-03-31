import crypto, { JsonWebKey } from 'node:crypto';
import * as b64ab from 'base64-arraybuffer';

const KEY_EXPORT_FORMAT = 'jwk';
const ENCRYPTION_ALGO = 'AES-GCM';
const IV_LENGTH = 12; // For GCM a nonce length of 12 bytes is recommended!
const KEY_USAGES = ['encrypt', 'decrypt'] as const;

export async function generateEncryptionKeyString() {
  const key = await crypto.subtle.generateKey(
    { name: ENCRYPTION_ALGO, length: 256 },
    true,
    KEY_USAGES,
  );
  const exportableKey = await crypto.subtle.exportKey(KEY_EXPORT_FORMAT, key);
  return exportableKey.k!;
}

export async function importEncryptionKey(keyData: JsonWebKey) {
  return crypto.subtle.importKey(
    KEY_EXPORT_FORMAT,
    keyData,
    ENCRYPTION_ALGO,
    true,
    KEY_USAGES,
  );
}
export async function importEncryptionKeyString(keyStr: string) {
  return importEncryptionKey({
    key_ops: KEY_USAGES,
    ext: true,
    kty: 'oct',
    k: keyStr,
    alg: 'A256GCM',
  });
}

export async function encrypt(key: crypto.webcrypto.CryptoKey, rawValue: any, additionalData?: string) {
  const nonce = crypto.randomBytes(IV_LENGTH);

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGO,
      iv: nonce,
      tagLength: 128, // ?
      ...additionalData && { additionalData: Buffer.from(additionalData, 'base64') },
    },
    key,
    new TextEncoder().encode(JSON.stringify(rawValue)),
  );
  const ivWithData = new Uint8Array(
    Array.from(nonce).concat(Array.from(new Uint8Array(encryptedData))),
  );
  const encryptedStr = b64ab.encode(ivWithData);
  return encryptedStr;
}


export async function decrypt(key: crypto.webcrypto.CryptoKey, base64EncryptedVal: string, additionalData?: string) {
  const nonceCiphertextTag = new Uint8Array(b64ab.decode(base64EncryptedVal));
  const decryptionNonce = nonceCiphertextTag.subarray(0, IV_LENGTH);
  const ciphertextTag = nonceCiphertextTag.subarray(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt({
    name: ENCRYPTION_ALGO,
    iv: decryptionNonce,
    ...additionalData && { additionalData: Buffer.from(additionalData, 'base64') },
  }, key, ciphertextTag);

  const decryptedStr = new TextDecoder().decode(decrypted);
  const decryptedValue = JSON.parse(decryptedStr);
  return decryptedValue;

  // const nonceCiphertextTag = new Uint8Array(base64ToArrayBuffer(base64EncryptedVal));
  // const nonce = nonceCiphertextTag.subarray(0, IV_LENGTH);
  // const ciphertextTag = nonceCiphertextTag.subarray(IV_LENGTH);

  // const aesKey = await crypto.subtle.importKey(
  //   'raw',
  //   base64ToArrayBuffer(key),
  //   'AES-GCM',
  //   true,
  //   ['encrypt', 'decrypt'],
  // );
  // const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aesKey, ciphertextTag);
  // return new TextDecoder().decode(decrypted);
}

