/* eslint-disable no-console */
import crypto, { JsonWebKey } from 'node:crypto';
import kleur from 'kleur';
import * as b64ab from 'base64-arraybuffer';
import { DmnoBaseTypes, createDmnoDataType } from './config-engine/base-types';
import {
  decrypt, encrypt, importEncryptionKeyString,
} from './lib/encryption';


const KEY_EXPORT_FORMAT = 'jwk';
const ENCRYPTION_ALGO = 'AES-GCM';
const KEY_USAGES = ['encrypt', 'decrypt'] as const;
const IV_LENGTH = 12; // For GCM a nonce length of 12 bytes is recommended!

const key = await crypto.subtle.generateKey(
  { name: ENCRYPTION_ALGO, length: 256 },
  true,
  KEY_USAGES,
);

const exportedKey = await crypto.subtle.exportKey(KEY_EXPORT_FORMAT, key);
console.log(exportedKey.k);
const importedKey = await importEncryptionKeyString(exportedKey.k!);

const rawData = { foo: 1, bar: 2, someMoreData: 'herllkasdf lkajsdf lkajsd flkja sdflkj asdlkfj alskdfj alksdj flaksdjf ' };

const encryptedStr = await encrypt(importedKey, rawData, 'u123');
console.log(encryptedStr);
const decryptedData = await decrypt(importedKey, encryptedStr, 'u123');
console.log(decryptedData);
