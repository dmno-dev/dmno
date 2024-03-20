import crypto, { JsonWebKey } from 'node:crypto';


const KEY_EXPORT_FORMAT = 'jwk';
const ENCRYPTION_ALGO = 'AES-GCM';
const KEY_USAGES = ['encrypt', 'decrypt'] as const;

export async function generateEncryptionKey() {
  const key = await crypto.subtle.generateKey(
    { name: ENCRYPTION_ALGO, length: 256 },
    true,
    KEY_USAGES,
  );
  console.log(key);
  const exportableKey = await crypto.subtle.exportKey(KEY_EXPORT_FORMAT, key);
  console.log(exportableKey);
  return exportableKey;
}

export async function importEncryptionKey(keyData: JsonWebKey) {
  const key = await crypto.subtle.importKey(KEY_EXPORT_FORMAT, keyData, ENCRYPTION_ALGO, true, KEY_USAGES);
  return key;
}


const IV_LENGTH = 12; // For GCM a nonce length of 12 bytes is recommended!

export function encrypt(key: string, rawValue: string) {
  let nonce = crypto.randomBytes(IV_LENGTH);

  let cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'base64'), nonce);
  let nonceCiphertextTag = Buffer.concat([
    nonce,
    cipher.update(Buffer.from(rawValue, 'utf8')),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return nonceCiphertextTag.toString('base64');
}


export async function decrypt(key: string, base64EncryptedVal: string) {
  let nonceCiphertextTag = new Uint8Array(base64ToArrayBuffer(base64EncryptedVal));
  let nonce = nonceCiphertextTag.subarray(0, IV_LENGTH);
  let ciphertextTag = nonceCiphertextTag.subarray(IV_LENGTH);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(key),
    'AES-GCM',
    true,
    ['encrypt', 'decrypt'],
  );
  let decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aesKey, ciphertextTag);
  return new TextDecoder().decode(decrypted);
}

// https://stackoverflow.com/a/21797381/9014097
function base64ToArrayBuffer(base64: string) {
  let binary_string = atob(base64);
  let len = binary_string.length;
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
