import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import Debug from 'debug';
import { parse as parseJSONC } from 'jsonc-parser';
import { ConfigraphCacheEntry, ConfigraphCachingProvider } from '@dmno/configraph';
import {
  decrypt, encrypt, generateDmnoEncryptionKeyString, importDmnoEncryptionKeyString,
} from '@dmno/encryption-lib';
import { stringifyJsonWithCommentBanner } from '../lib/json-utils';
import { asyncMapValues } from '../lib/async-utils';
import { pathExists } from '../lib/fs-utils';

const debug = Debug('dmno:cache');

type SerializedCacheEntry = {
  updatedAt: string,
  encryptedValue: string;
  usedByItems: Array<string>;
};
type SerializedCache = {
  version: string;
  keyName: string;
  items: Record<string, SerializedCacheEntry>;
};
type SerializedCacheKey = {
  version: string;
  key: string;
};


export class DmnoConfigraphCachingProvider extends ConfigraphCachingProvider {
  cacheDirPath?: string;

  get cacheFilePath() { return `${this.cacheDirPath}/cache.json`; }
  get cacheKeyFilePath() { return `${this.cacheDirPath}/cache-key.json`; }

  encryptionKey?: crypto.webcrypto.CryptoKey;
  encryptionKeyName?: string;

  private getEncryptedValue(value: any) {
    if (!this.encryptionKey || !this.encryptionKeyName) {
      throw new Error('You must set encryption key to encrypt values');
    }
    return encrypt(this.encryptionKey, JSON.stringify(value), this.encryptionKeyName);
  }

  async load() {
    if (!this.cacheDirPath) {
      throw new Error('Cache directory must be set');
    }

    // create the cache key file if it does not exist
    if (!fs.existsSync(this.cacheKeyFilePath)) {
      let keyName: string;
      try {
        const gitUserEmail = execSync('git config user.email').toString().trim();
        keyName = `${gitUserEmail}/${new Date().toISOString()}`;
      } catch (err) {
        keyName = `unknown/${new Date().toISOString()}`;
      }
      // when running in CI or elsewhere we wont have a git username so we fallback to something else
      keyName ||= `${process.env.NODE_ENV}/${new Date().toISOString()}`;
      const dmnoKeyStr = await generateDmnoEncryptionKeyString(keyName);

      const reimportedDmnoKey = await importDmnoEncryptionKeyString(dmnoKeyStr);
      if (reimportedDmnoKey.keyName !== keyName) throw new Error('reimported key name doesnt match');
      this.encryptionKey = reimportedDmnoKey.key;
      this.encryptionKeyName = keyName;

      const cacheKeyData: SerializedCacheKey = {
        version: '0.0.1',
        key: dmnoKeyStr,
      };
      await fs.promises.writeFile(this.cacheKeyFilePath, stringifyJsonWithCommentBanner(cacheKeyData));

      if (fs.existsSync(this.cacheFilePath)) {
        // destroy the cache file, since it will not match the new key...
        // should we confirm this with the user? probably doesn't matter?
        await fs.promises.unlink(this.cacheFilePath);
      }
    // or load an existing one
    } else {
      const cacheKeyRawStr = await fs.promises.readFile(this.cacheKeyFilePath, 'utf-8');
      const cacheKeyRaw = parseJSONC(cacheKeyRawStr) as SerializedCacheKey;
      const importedDmnoKey = await importDmnoEncryptionKeyString(cacheKeyRaw.key);
      this.encryptionKey = importedDmnoKey.key;
      this.encryptionKeyName = importedDmnoKey.keyName;
    }
    if (!this.encryptionKey || !this.encryptionKeyName) {
      throw new Error('Missing encryption key');
    }

    // now load the cache file
    if (fs.existsSync(this.cacheFilePath)) {
      const cacheRawStr = await fs.promises.readFile(this.cacheFilePath, 'utf-8');
      const cacheRaw = parseJSONC(cacheRawStr) as SerializedCache;

      // check if the ID in the cache file matches the cache key
      if (this.encryptionKeyName !== cacheRaw.keyName) {
        throw new Error('DMNO cache file does not match cache key');
      }

      for (const itemCacheKey in cacheRaw.items) {
        const itemRaw = cacheRaw.items[itemCacheKey];
        const valueStr = await decrypt(this.encryptionKey, itemRaw.encryptedValue, this.encryptionKeyName);
        this.items[itemCacheKey] = new ConfigraphCacheEntry(itemCacheKey, JSON.parse(valueStr), {
          // we are tossing out the saved "usedBy" entries since we'll have new ones after this config run
          updatedAt: new Date(itemRaw.updatedAt),
          // we are saving the encrypted value, so it wont churn from re-encryption
          encryptedValue: itemRaw.encryptedValue,
        });
      }
    }
    this.cacheLastLoadedAt = new Date();
  }
  async save() {
    // we don't want to write a file if the cache has not changed because it will trigger vite to reload
    if (this.cacheLastLoadedAt && Object.values(this.items).every((item) => item.updatedAt < this.cacheLastLoadedAt!)) {
      return;
    }

    if (!this.encryptionKeyName || !this.encryptionKey) {
      throw new Error('Encryption key must be set properly to save');
    }

    const serializedCache: SerializedCache = {
      version: '0.0.1',
      keyName: this.encryptionKeyName,
      items: await asyncMapValues(this.items, async (cacheItem) => {
        return {
          encryptedValue: cacheItem.encryptedValue || await this.getEncryptedValue(cacheItem.value),
          updatedAt: cacheItem.updatedAt.toISOString(),
          usedByItems: Array.from(cacheItem.usedByItems),
        };
      }),
    };
    const serializedCacheStr = stringifyJsonWithCommentBanner(serializedCache);
    await fs.promises.writeFile(this.cacheFilePath, serializedCacheStr, 'utf-8');
  }

  async reset() {
    debug('resetting dmno cache', {
      cacheFilePath: this.cacheFilePath,
      cacheKeyFilePath: this.cacheKeyFilePath,
    });

    if (await pathExists(this.cacheFilePath)) {
      try {
        await fs.promises.unlink(this.cacheFilePath);
        debug('cache file deleted');
      } catch (err) {
        debug(err);
      }
    } else {
      debug('cache file not found');
    }

    if (await pathExists(this.cacheKeyFilePath)) {
      try {
        await fs.promises.unlink(this.cacheKeyFilePath);
        debug('cache key file deleted');
      } catch (err) {
        debug(err);
      }
    } else {
      debug('cache key file not found');
    }
  }
}
