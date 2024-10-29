<template lang="pug">
Teleport(to="#app")
  .dropdown-menu(
    v-if="isOpen"
    ref="root"
    v-bind="dynamicAttrs"
    :class="computedClasses"
    :style="computedStyles"
  )
    //- child items can be passed as props
    DropdownMenuItem(
      v-for="itemFromProps in props.items" :key="itemFromProps.label"
      v-bind="itemFromProps"
    )
    //- or using DropdownMenuItem within the default slot
    slot
</template>

<script lang="ts">
// define and export ctx related helpers with an additional (non-setup) script tag
// which will be used by the DropdownMenuItem component

type DropdownMenuCtx = {
  /** is the menu currently open */
  isOpen: Ref<boolean>;
  /** id of the currently focused item (if applicable) */
  focusedItemId: Ref<string | undefined>;

  /** function to register a new child item */
  registerItem(id: string, component: ComponentInternalInstance): void;
  /** function to de-register a child item */
  unregisterItem(id: string): void;

  /** open the dropdown menu, optionally passing in event info related to anchoring */
  open(e?: MouseEvent, anchorToMouse?: boolean): void;
  /** close the menu */
  close(): void;
  /** set focus to specific item id */
  setFocusItemById(id?: string): void;
};

export const DropdownMenuCtxInjectionKey: InjectionKey<DropdownMenuCtx> = Symbol('DropdownMenuCtx');

export function useDropdownMenuCtx() {
  const ctx = inject(DropdownMenuCtxInjectionKey, null);
  if (!ctx) throw new Error('<DropdownMenuItem> must be within a <DropdownMenu>');
  return ctx;
}
</script>

<!-- eslint-disable import/first -->
<script lang="ts" setup>
import {
  ref, computed, inject, provide, reactive,
  type Ref, type ComponentInternalInstance, type InjectionKey,
  useTemplateRef,
} from 'vue';
import { unwrapDomRef } from '@/utils/dom-utils';
import DropdownMenuItem from './DropdownMenuItem.vue';

export type DropdownMenuItemObjectDef = InstanceType<typeof DropdownMenuItem>['$props'];

const props = defineProps<{
  anchorTo?: any,
  forceAbove?: boolean,
  forceAlignRight?: boolean,
  items?: Array<DropdownMenuItemObjectDef>,
}>();

const domEl = useTemplateRef('root');

function nextFrame(nextFrameCallback: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(nextFrameCallback));
}

// ~ item + focus management ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const itemsById = reactive({} as Record<string, ComponentInternalInstance>);
const sortedItemIds = ref<Array<string>>([]);
const itemsCount = computed(() => sortedItemIds.value.length);
const focusedItemId = ref<string>();

function registerItem(id: string, component: ComponentInternalInstance) {
  itemsById[id] = component;
  refreshSortedItemIds();
}
function unregisterItem(id: string) {
  delete itemsById[id];
  refreshSortedItemIds();
}

function refreshSortedItemIds() {
  if (!isOpen.value) return;
  // sort items based on their actual order within the DOM
  sortedItemIds.value = Object.keys(itemsById).sort((id1, id2) => {
    const domNode1 = unwrapDomRef(itemsById[id1]?.exposed?.rootEl);
    const domNode2 = unwrapDomRef(itemsById[id2]?.exposed?.rootEl);
    if (!domNode1 || !domNode2) return 0;
    const position = domNode1.compareDocumentPosition(domNode2);
    /* eslint-disable no-bitwise */
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

const focusedItemIndex = computed({
  get() {
    if (!focusedItemId.value) return undefined;
    return sortedItemIds.value.indexOf(focusedItemId.value);
  },
  set(newIndex: number | undefined) {
    if (newIndex === undefined) {
      focusedItemId.value = undefined;
      return;
    }
    let validNewIndex = newIndex;
    if (validNewIndex < 0) validNewIndex = 0;
    else if (validNewIndex >= itemsCount.value) validNewIndex = itemsCount.value - 1;
    focusedItemId.value = sortedItemIds.value[validNewIndex];
  },
});
const focusedItem = computed(() => {
  if (!focusedItemId.value) return;
  return itemsById[focusedItemId.value];
});
const focusedItemEl = computed(() => {
  return unwrapDomRef(focusedItem.value?.exposed?.rootEl);
});

function setFocusItemById(id?: string) {
  if (id && itemsById[id]) focusedItemId.value = id;
  else focusedItemId.value = undefined;
}

// ~ opening/closing and positioning ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const isOpen = ref(false);
const readOnlyIsOpen = computed(() => isOpen.value);
const isRepositioning = ref(false);

function open(e?: MouseEvent, anchorToMouse?: boolean) {
  const clickTargetIsElement = e?.target instanceof HTMLElement;

  if (props.anchorTo) {
    // anchor to specific element passed in via props
    anchorEl.value = props.anchorTo.$el;
  } else if (e && (anchorToMouse || !clickTargetIsElement)) {
    // anchor to mouse position if `anchorToMouse` is true or mouse event has no target=
    anchorEl.value = undefined;
    anchorPos.value = { x: e?.clientX, y: e.clientY };
  } else if (clickTargetIsElement) {
    // anchor to click event target
    anchorEl.value = e.target;
  } else {
    // should not happen - throw?
    anchorEl.value = undefined;
    throw new Error('DropdownMenu open has no anchor info');
  }

  isRepositioning.value = true;
  isOpen.value = true;

  setFocusItemById();
  nextFrame(finishOpening);
}
function finishOpening() {
  startListening();
  readjustMenuPosition();
}
function close() {
  isOpen.value = false;
  stopListening();
}

const anchorEl = ref<HTMLElement>();
const anchorPos = ref<{ x: number; y: number }>();

const hAlign = ref<'left' | 'right'>('left');
const vAlign = ref<'below' | 'above'>('below');
const posX = ref(0);
const posY = ref(0);

const BUFFER_PX = 4;

function readjustMenuPosition() {
  if (!domEl.value) return;

  isRepositioning.value = false;

  let anchorRect;
  if (anchorEl.value) {
    anchorRect = anchorEl.value.getBoundingClientRect();
  } else if (anchorPos.value) {
    anchorRect = new DOMRect(anchorPos.value.x, anchorPos.value.y);
  } else {
    throw new Error('DropdownMenu must be anchored to an element or mouse position');
  }
  const menuRect = domEl.value.getBoundingClientRect();

  // attempt aligning left with the anchor and if goes off screen align right with right edge of screen
  hAlign.value = 'left';
  posX.value = anchorRect.x;

  const windowWidth = document.documentElement.clientWidth;
  if (props.forceAlignRight) {
    hAlign.value = 'right';
    posX.value = windowWidth - anchorRect.right;
  } else if (posX.value + menuRect.width > windowWidth) {
    hAlign.value = 'right';
    posX.value = BUFFER_PX;
  }

  // attempt aligning below the anchor, and otherwise position above
  vAlign.value = 'below';
  posY.value = anchorRect.bottom + BUFFER_PX;
  if (props.forceAbove || posY.value + menuRect.height > window.innerHeight) {
    vAlign.value = 'above';
    posY.value = window.innerHeight - (anchorRect.top - BUFFER_PX);
  }
}

const computedClasses = computed(() => ({
  '--repositioning': isRepositioning.value,
}));

const computedStyles = computed(() => ({
  ...(hAlign.value === 'left' && { left: `${posX.value}px` }),
  ...(hAlign.value === 'right' && { right: `${posX.value}px` }),
  ...(vAlign.value === 'below' && { top: `${posY.value}px` }),
  ...(vAlign.value === 'above' && { bottom: `${posY.value}px` }),
}));

const dynamicAttrs = computed(() => ({
  tabindex: 0,
  'aria-activedescendant': focusedItemId.value || undefined,
  // TODO: aria-labelledby?
}));


// ~ event handlers ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function onWindowMousedown(e: MouseEvent) {
  // mousedown within the menu needs to trigger normal behaviour and then close on mouseUp
  // otherwise we'll just close
  if (e.target instanceof Element && domEl.value?.contains(e.target)) {
    window.addEventListener('click', close, { once: true });
  } else {
    close();
  }
}
function onWindowKeydown(e: KeyboardEvent) {
  domEl.value?.focus({ preventScroll: true });

  if (e.key === 'ArrowUp') {
    if (focusedItemIndex.value === undefined) focusedItemIndex.value = sortedItemIds.value.length - 1;
    else focusedItemIndex.value -= 1;
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    if (focusedItemIndex.value === undefined) focusedItemIndex.value = 0;
    else focusedItemIndex.value += 1;
    e.preventDefault();
  } else if (e.key === 'Enter' || e.key === ' ') {
    focusedItemEl.value?.click();
    e.preventDefault();
  } else if (e.key === 'Escape') {
    close();
  }
}
function startListening() {
  window.addEventListener('keydown', onWindowKeydown);
  window.addEventListener('mousedown', onWindowMousedown);
}
function stopListening() {
  window.removeEventListener('keydown', onWindowKeydown);
  window.removeEventListener('click', onWindowMousedown);
}

// ~ external ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ctx object provided to child menu items via `useDropdownMenuCtx` (see above)
provide(DropdownMenuCtxInjectionKey, {
  isOpen: readOnlyIsOpen,
  focusedItemId,
  open,
  close,
  registerItem,
  unregisterItem,
  setFocusItemById,
});

defineExpose({
  isOpen: readOnlyIsOpen,
  open,
  close,
});
</script>

<style scoped>
.dropdown-menu {
  z-index: 100;
  position: fixed;
  font-size: 13px;
  padding: 4px;

  background: black;
  color: white;

  border: 1px solid white;
  border-radius: 8px;

  display: grid;
  grid-template-columns: auto auto auto auto;

  &.--repositioning {
    opacity: 0;
  }

  &:empty {
    display: none;
  }
}
</style>
