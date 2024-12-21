<template lang="pug">
a.tile-button(
  :class="computedClasses"
  :href="href"
  @mouseenter="$emit('hover:start')"
  @mouseleave="$emit('hover:end')"
  @click="(e) => emit('click', e)"
)
  .tile-button__shadow
  .tile-button__back
  .tile-button__front
    //- .tile-button__icon
      //- Icon(:icon="info.icon" class="icon" :style="{ color: info.color }")
    .tile-button__label
      slot {{ label }}


</template>

<script setup lang="ts">
import { onMount } from 'nanostores';
import {
  ref, computed, type PropType, onBeforeMount,
} from 'vue';

const { size = 'm' } = defineProps<{
  label?: string;
  href?: string;
  size?: 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl'
}>();


const emit = defineEmits(['click']);

const computedClasses = computed(() => ({
  [`--size-${size}`]: true,
}));

</script>

<style scoped>

@property --tile-thickness {
  syntax: "<length>";
  inherits: true;
  initial-value: 0px;
}

.tile-button {

  --tile-edge-color: #EEE;
  html[data-theme="light"] & {
    --tile-edge-color: #222;
  }

  --full-tile-thickness: 4px;

  &.--size-xs {
    --padding-y: 2px;
    --padding-x: 2px;
    --tile-radius: 3px;
    --full-tile-thickness: 2px;
  }
  &.--size-s {
    --padding-y: 2px;
    --padding-x: 4px;
    --tile-radius: 4px;
    --full-tile-thickness: 3px;
  }
  &.--size-m {
    --padding-y: 7px;
    --padding-x: 12px;
    --tile-radius: 6px;
  }
  &.--size-l {
    --padding-y: 6px;
    --padding-x: 16px;
    --tile-radius: 6px;
  }
  &.--size-xl {
    --padding-y: 8px;
    --padding-x: 22px;
    --tile-radius: 8px;
  }
  &.--size-2xl {
    --padding-y: 10px;
    --padding-x: 26px;
    --tile-radius: 10px;
  }

  cursor: pointer;
  text-decoration: none;
  font-weight: bold;
  width: max-content;
  position: relative;

  transition: --tile-thickness .2s cubic-bezier(.3, .7, .4, 1);;

  will-change: transform;
  outline-offset: 4px;

  :focus:not(:focus-visible) {
    outline: none;
  }

  /* slower slide back in */
  transition: --tile-thickness .6s cubic-bezier(.3, .7, .4, 1);

  &:hover, &:focus {
    --tile-thickness: var(--full-tile-thickness);
    /* slide out more quickly */
    transition: --tile-thickness .25s cubic-bezier(.3, .7, .4, 1.5);
  }
  &:active {
    --tile-thickness: 2px !important;
    transition: --tile-thickness 34ms;
  }
}

.tile-button__front {
  background: var(--brand-purple);
  border-radius: var(--tile-radius);
  color: white;
  padding: var(--padding-y) var(--padding-x);
  height: 100%;
  position: relative;
  z-index: 3;
  display: grid;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--tile-edge-color);
  transform: translate(var(--tile-thickness), var(--tile-thickness));
}
.tile-button__back {
  border-radius: var(--tile-radius);
  background: #888;
  position: absolute;
  will-change: transform;
  inset: 0;
  z-index: 2;
  border: 1px solid var(--tile-edge-color);

  /* 3d top face */
  &:before {
    content: '';
    /* right: calc(-.2 * var(--tile-radius)); */

    left: calc(var(--tile-thickness) + var(--tile-radius) / 2);
    right: calc(-.25 * var(--tile-thickness));
    height: calc(var(--tile-thickness));


    border-top-right-radius: 2px;
    /* background: var(--tile-shadow-color); */
    position: absolute;
    transform: skewX(45deg);
    /* box-shadow: inset 0px -4px 4px rgba(0,0,0,.3); */
    background: #AAA;
    /* border-top: 1px solid var(--tile-edge-color); */
    border-right: 1px solid var(--tile-edge-color);
  }
  /* 3d left face */
  &:after {
    content: '';
    top: calc(var(--tile-thickness) + var(--tile-radius) / 2);
    bottom: calc(-.25 * var(--tile-thickness));
    width: calc(var(--tile-thickness));
    border-bottom-left-radius: 2px;
    background: var(--tile-shadow-color);
    background: #555;
    position: absolute;
    transform: skewY(45deg);
    /* border-left: 1px solid var(--tile-edge-color); */
    border-bottom: 1px solid var(--tile-edge-color);
    /* box-shadow: inset -4px 0px 4px rgba(0,0,0,.3); */
  }
}
.tile-button__shadow {
  height: calc(1.1 * var(--tile-thickness));
  position: absolute;
  bottom: 1px;
  left: calc(var(--tile-radius)/4);
  right: calc(var(--tile-thickness)/2);
  box-shadow: calc(-2.5 * var(--tile-thickness)) calc(1 * var(--tile-thickness)) var(--tile-thickness) rgba(0,0,0,.3);
  transform:
    translate(var(--tile-thickness), var(--tile-thickness))
    skewX(45deg);
  z-index: 1;
}
</style>
