import {
  expect, test, describe, vi,
  afterEach,
} from 'vitest';
import _ from 'lodash-es';
import {
  cacheFunctionResult,
  Configraph, ConfigraphCachingProvider,
  createResolver,
} from '@dmno/configraph';


class TestCache extends ConfigraphCachingProvider {
  items: Record<string, any> = {};
  reset() { this.items = {}; }

  /* eslint-disable class-methods-use-this,@typescript-eslint/no-empty-function */
  async load() {}
  async save() {}
  async getItem(key) {
    return this.items[key];
  }
  async setItem(key, value) {
    this.items[key] = value;
  }
}

const testCache = new TestCache();
const loadSpy = vi.spyOn(testCache, 'load');
const saveSpy = vi.spyOn(testCache, 'save');

let cacheCounter = 1;
const cacheTestResolver = (cacheKey) => createResolver({
  label: 'cache-test-resolver',
  async resolve(ctx) {
    return ctx.getOrSetCacheItem(cacheKey, async () => {
      return `${cacheKey}-${cacheCounter++}`;
    });
  },
});

describe('caching', () => {
  afterEach(() => {
    testCache.reset();
    vi.restoreAllMocks();
  });

  test('test basic caching logic', async () => {
    const g = new Configraph();
    g.cacheProvider = testCache;

    const e = g.createEntity({
      configSchema: {
        random: { value: (ctx) => Math.floor(Math.random() * 100) },
        randomCached: { value: cacheFunctionResult((ctx) => Math.floor(Math.random() * 100)) },
        testCache: { value: cacheTestResolver('key1') },
        testCache2: { value: cacheTestResolver('key1') },
        testCache3: { value: cacheTestResolver('key2') },
      },
    });

    await testCache.setItem('cache-test', 'foobar');

    expect(loadSpy).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
    await g.resolveConfig();
    expect(loadSpy).toHaveBeenCalledOnce();
    expect(saveSpy).toHaveBeenCalledOnce();

    // cache gets reused for these 2 items
    expect(e.configNodes.testCache.resolvedValue).toBe('key1-1');
    expect(e.configNodes.testCache2.resolvedValue).toBe('key1-1');
    // no cache hit for this one, different key and counter goes up
    expect(e.configNodes.testCache3.resolvedValue).toBe('key2-2');

    // TODO: enable re-resolving everything, and we should see the cach get reused
  });
});
