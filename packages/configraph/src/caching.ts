import * as _ from 'lodash-es';
import { ConfigValue } from './resolvers';

export type CacheMode = 'skip' | 'clear' | true;

export abstract class ConfigraphCachingProvider {
  protected cacheLastLoadedAt: Date | undefined;
  protected items: Record<string, ConfigraphCacheEntry> = {};

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
        usedBy: nodeFullPath,
      });
    } else {
      this.items[key] = new ConfigraphCacheEntry(key, value, {
        usedBy: nodeFullPath,
      });
    }
  }

  abstract load(): Promise<void> | void;
  abstract save(): Promise<void> | void;
  abstract reset(): Promise<void> | void;
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



