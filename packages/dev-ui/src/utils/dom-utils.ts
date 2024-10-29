import { unref } from 'vue';

export function unwrapDomRef(domRef: any): HTMLElement | undefined {
  const el = unref(domRef);
  return el.$el || el;
}

