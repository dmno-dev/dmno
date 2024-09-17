import _ from 'lodash-es';
import { ConfigValue } from '.';

export type CacheMode = 'skip' | 'clear' | true;

export abstract class ConfigraphCachingProvider {
  protected cacheLastLoadedAt: Date | undefined;
  protected items: Record<string, ConfigraphCacheEntry> = {};

  // default implementation of encrypt/decrypt is to do nothing
  /* eslint-disable class-methods-use-this */
  // async encrypt(val: any): Promise<string> { return val; }
  // async decrypt(val: string): Promise<any> { return val; }

  async getItem(key: string, nodeFullPath: string) {
    if (this.items[key]) {
      this.items[key].usedByItems.add(nodeFullPath);
      return this.items[key].value as ConfigValue;
    }
  }

  async setItem(key: string, value: ConfigValue, nodeFullPath: string) {
    const existingItem = this.items[key];
    if (existingItem) {
      // TODO: update the existing item?
      this.items[key] = new ConfigraphCacheEntry(key, value, {
        // encryptedValue: await this.encrypt(value),
        usedBy: nodeFullPath,
      });
    } else {
      this.items[key] = new ConfigraphCacheEntry(key, value, {
        // encryptedValue: await this.encrypt(value),
        usedBy: nodeFullPath,
      });
    }
  }

  // abstract _getItemByKey(key: string, nodeFullPath: string): any;
  // abstract _setItem(key: string, value: any, nodeFullPath: string): any;
  abstract load(): Promise<void>;
  abstract save(): Promise<void>;
}

export class ConfigraphCacheEntry {
  readonly usedByItems: Set<string>;
  readonly updatedAt: Date;
  readonly encryptedValue?: string;

  constructor(
    readonly key: string,
    readonly value: any,
    more?: {
      encryptedValue?: string,
      usedBy?: string | Array<string>,
      updatedAt?: Date,
    },
  ) {
    this.updatedAt = more?.updatedAt || new Date();
    this.usedByItems = new Set(_.castArray(more?.usedBy || []));
    // we store the value passed rather than recalculating so the cache file won't churn
    this.encryptedValue = more?.encryptedValue;
  }
}



