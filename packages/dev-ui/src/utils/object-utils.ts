export function eachEntry<K extends string, V>(
  obj: Record<K, V>,
  iterator: ((key: K, val: V) => void),
) {
  Object.entries(obj).forEach(([key, val]) => iterator(key as K, val as V));
}
