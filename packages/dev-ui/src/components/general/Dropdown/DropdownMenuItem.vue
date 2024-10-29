<template lang="pug">
component.dropdown-menu-item(
  :is="htmlTagOrComponentType"
  :id
  ref="root"
  :class="computedClasses"
  v-bind="dynamicAttrs"
  role="menuitem"
  @mouseenter="onMouseEnter"
  @mouseleave="onMouseLeave"
  @click="onClick"
)
  Icon.dropdown-menu-item__check(v-if="checked !== undefined" :name="checked ? 'check' : 'none'" size="xs")
  slot(name="icon")
    Icon.dropdown-menu-item__icon(v-if="icon" :name="icon" size="s")

  .dropdown-menu-item__label
    slot
      ._truncate {{ label }}
  .dropdown-menu-item__shortcut(v-if="shortcut") {{ shortcut }}
</template>

<script lang="ts" setup>
import {
  computed, getCurrentInstance, onBeforeUnmount, onMounted,
  useTemplateRef,
} from 'vue';
import { RouterLink } from 'vue-router';
import Icon from '../Icon.vue';
import { type FavoriteIconNames } from '../Icon.vue';
import { useDropdownMenuCtx } from './DropdownMenu.vue';

const props = defineProps<{
  // pass in a label here , or can use the default slot
  label?: string,
  // icon short name
  icon?: FavoriteIconNames,

  // using this prop makes the item normal link <a>
  href?: string,

  // using these makes the item a <RouterLink>
  linkToNamedRoute?: string,
  linkTo?: string | Object,

  // applicable to both <a> and <RouterLink>
  target?: string,

  disabled?: boolean,

  // set true or false only if actually checkable
  checked?: boolean,

  // shows a letter for keyboard command ex: "Cut [X]"
  shortcut?: string,
}>();

const emit = defineEmits<{ select: [] }>();

const rootEl = useTemplateRef<HTMLElement>('root');
const parentMenuCtx = useDropdownMenuCtx();

const id = `dropdown-menu-item-${idCounter++}`;

const htmlTagOrComponentType = computed(() => {
  if (props.href) return 'a';
  if (props.linkTo || props.linkToNamedRoute) return RouterLink;
  return 'div';
});

const isFocused = computed(() => {
  return parentMenuCtx.focusedItemId.value === id;
});

const computedClasses = computed(() => ({
  '--disabled': props.disabled,
  '--focused': isFocused.value,
}));

// some attributes need to be set if item is <RouterLink> or <a>
// but can cause problems if set otherwise
const dynamicAttrs = computed(() => ({
  // set "to" if we are using a <RouterLink>
  ...(htmlTagOrComponentType.value === RouterLink && {
    to: props.linkToNamedRoute
      ? { name: props.linkToNamedRoute }
      : props.linkTo,
  }),

  // set "href" if we are using an <a>
  ...(htmlTagOrComponentType.value === 'a' && {
    href: props.href,
  }),

  // set "target" when any kind of link
  ...((htmlTagOrComponentType.value === RouterLink
      || (htmlTagOrComponentType.value === 'a' && props.target)) && {
    target: props.target,
  }),

  ...!props.disabled && { 'tab-index': -1 },
  ...props.disabled && { 'aria-disabled': true },
}));


// ~ event handlers ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function onMouseEnter() {
  if (props.disabled) return;
  parentMenuCtx.setFocusItemById(id);
}
function onMouseLeave() {
  if (props.disabled) return;
  if (!isFocused.value) return;
  parentMenuCtx.setFocusItemById(); // clears focus
}
function onClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault();
    return;
  }
  emit('select');
  parentMenuCtx.close();
}

// ~ Lifecycle ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
onMounted(() => {
  parentMenuCtx.registerItem(id, getCurrentInstance()!);
});
onBeforeUnmount(() => {
  parentMenuCtx.unregisterItem(id);
});

// ~ external  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
defineExpose({ rootEl });
</script>


<script lang="ts">
let idCounter = 1;
</script>

<style scoped>
.dropdown-menu-item {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  line-height: 1cap;
  display: grid;
  gap: 8px;
  align-items: center;
  justify-content: start;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  > * {
    pointer-events: none;
  }

  &.--focused {
    background: var(--brand-purple);
  }
  &.--disabled {
    color: gray;
  }

}

.dropdown-menu-item__check {
  pointer-events: none;
  margin-right: -2px;
  grid-column: 1 / 2;
}
.dropdown-menu-item__icon {
  grid-column: 2 / 3;
}
.dropdown-menu-item__label {
  grid-column: 3 / 4;
  max-width: 200px;
  flex-shrink: 0;
  /* extra left spacing if not using any icon */
  &:first-child {
    padding-left: 4px;
  }
}
.dropdown-menu-item__shortcut {
  grid-column: 4 / 5;
  font-size: 10px;
  margin-left: 12px;
  background: rgba(255,255,255,.3);
  border-radius: 2px;
  width: 14px;
  height: 14px;
  display: grid;
  align-items: center;
  justify-items: center;
  &:empty {
    display: none;
  }
}

</style>
