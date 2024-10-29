<template lang="pug">
.d-icon(v-tooltip="props.tooltip" :class="computedClasses")
  Icon(:icon="iconifyIconName")
</template>

<script lang="ts">

const FAVORITE_ICONS = {
  check: 'mdi:check',
  sensitive: 'mdi:lock',
  required: 'streamline:asterisk-1-solid',
  help: 'material-symbols:help',
  docs: 'fluent:book-question-mark-24-filled',
  'dark-mode': 'material-symbols:dark-mode',
  'light-mode': 'material-symbols:light-mode',
  sparkle: 'material-symbols:auto-awesome',
  chevron: 'ion:chevron-forward',
  git: 'simple-icons:git',
  website: 'lucide:link',
  npm: 'mdi:npm-variant-outline',
  none: 'oui:empty',
} as const;

export type FavoriteIconNames = keyof typeof FAVORITE_ICONS;

</script>

<!-- eslint-disable import/first -->
<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { Icon } from '@iconify/vue';

type IconSizes = 'xs' | 's' | 'm' | 'l' | 'xl';

const props = defineProps<{
  name?: FavoriteIconNames,
  fullName?: string,
  tooltip?: string,
  size?: IconSizes,
}>();

const computedClasses = computed(() => ({
  [`--size-${props.size || ''}`]: !!props.size,
}));

const iconifyIconName = computed(() => {
  if (props.name && FAVORITE_ICONS[props.name]) {
    return FAVORITE_ICONS[props.name];
  }
  return props.fullName || 'material-symbols:square-outline-rounded';
});

</script>

<style>
h1, h2, h3, h4 {
  > .d-icon {
    max-height: 2em;
    display: inline-block;
    vertical-align: center;
  }
}
</style>


<style scoped>
.d-icon {
  aspect-ratio: 1;
  position: relative;
  > svg {
    display: block;
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
  }

  &.--size-xs { width: 10px; }
  &.--size-s { width: 14px; }
  &.--size-m { width: 18px; }
  &.--size-l { width: 24px; }
  &.--size-xl { width: 36px; }
}
</style>

