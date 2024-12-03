import { asyncForEach, asyncMap, Queue } from 'modern-async';
import { toPairs, fromPairs } from 'lodash-es';

type RecordKey = string | number | symbol;

export async function asyncMapKeys<OK extends RecordKey, OV, MK extends RecordKey>(
  iterableObj: Record<OK, OV>,
  iteratee: (value: OV, key: OK) => Promise<MK> | MK,
  queueOrConcurrency?: Queue | number,
): Promise<Record<MK, OV>> {
  const objAsPairs: Array<[OK, OV]> = toPairs(iterableObj) as any;
  const mappedPairs = await asyncMap(objAsPairs, async ([key, value]) => {
    return [await iteratee(value, key), value] as [MK, OV];
  }, queueOrConcurrency);
  return fromPairs(mappedPairs) as Record<MK, OV>;
}

export async function asyncMapValues<OK extends RecordKey, OV, MV>(
  iterableObj: Record<OK, OV>,
  iteratee: (value: OV, key: OK) => Promise<MV> | MV,
  queueOrConcurrency?: Queue | number,
): Promise<Record<OK, MV>> {
  const objAsPairs: Array<[OK, OV]> = toPairs(iterableObj) as any;
  const mappedPairs = await asyncMap(objAsPairs, async ([key, value]) => {
    return [key, await iteratee(value, key)] as [OK, MV];
  }, queueOrConcurrency);
  return fromPairs(mappedPairs) as Record<OK, MV>;
}

export async function asyncEachSeries<V>(
  iterable: Iterable<V> | AsyncIterable<V>,
  iteratee: (value: V, index: number, iterable: Iterable<V> | AsyncIterable<V>) => Promise<void> | void,
): Promise<void> {
  return asyncForEach(iterable, iteratee, 1);
}

export async function asyncEachLimit<V>(
  iterable: Iterable<V> | AsyncIterable<V>,
  iteratee: (value: V, index: number, iterable: Iterable<V> | AsyncIterable<V>) => Promise<void> | void,
  concurrency: number,
): Promise<void> {
  return asyncForEach(iterable, iteratee, concurrency);
}

export async function asyncEachParallel<V>(
  iterable: Iterable<V> | AsyncIterable<V>,
  iteratee: (value: V, index: number, iterable: Iterable<V> | AsyncIterable<V>) => Promise<void> | void,
): Promise<void> {
  return asyncForEach(iterable, iteratee, Infinity);
}

export async function asyncMapParallel<V, M>(
  iterable: Iterable<V> | AsyncIterable<V>,
  iteratee: (value: V, index: number, iterable: Iterable<V> | AsyncIterable<V>) => Promise<M> | M,
): Promise<Array<M>> {
  return asyncMap(iterable, iteratee, Infinity);
}
