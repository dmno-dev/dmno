<template lang="pug">
  a.icon-graph-tile(
    :class="computedClasses" :href="info.docsHref"
    @mouseenter="$emit('hover:start')"
    @mouseleave="$emit('hover:end')"
  )
    .icon-graph-tile__shadow
    .icon-graph-tile__back
    .icon-graph-tile__front
      .icon-graph-tile__line
      .icon-graph-tile__icon
        Icon(:icon="info.icon" class="icon" :style="{ color: info.color }")
      .icon-graph-tile__dot-wrap
        DotsLoader(:start-at="dotNumber")
        //- .icon-graph-tile__dot

</template>

<script setup lang="ts">
import {
  ref, onMounted, onUnmounted, computed,
} from 'vue';
import { Icon } from '@iconify/vue';
import { DotsLoader } from '@dmno/ui-lib';

const props = defineProps<{
  info: {
    icon: string;
    label: string;
    docsHref: string;
    color?: string;
  }
  dotsPosition?: 'left' | 'right' | 'top' | 'bottom'
  dotNumber?: Number,
}>();

const computedClasses = computed(() => ({
  [`--dots-${props.dotsPosition || 'right'}`]: true,
}));

</script>

<style scoped>
.icon-graph-tile {
  --tile-radius: calc(.05 * var(--tile-width));
  --tile-thickness: calc(.04 * var(--tile-width));
  --tile-edge-color: #555;

  width: var(--tile-width);
  height: calc(var(--tile-width) / 2);
  position: relative;

  &:hover {
    --tile-edge-color: var(--accent-color, black);
    transform: scale(1.03);
  }

  &.--dots-left, &.--dots-right {
    width: var(--tile-width);
    height: calc(var(--tile-width) / 2);
    grid-template-columns: 1fr 1fr;
  }
  &.--dots-top, &.--dots-bottom {
    height: var(--tile-width);
    width: calc(var(--tile-width) / 2);
    grid-template-rows: 1fr 1fr;

    .icon-graph-tile__line {
      width: 80%;
      height: 1px;
      left: 10%;
      top: 50%;
    }

  }

  &.--dots-left .icon-graph-tile__front {
    grid-template-areas: "dots icon";
  }
  &.--dots-right .icon-graph-tile__front {
    grid-template-areas: "icon dots";
  }
  &.--dots-top .icon-graph-tile__front {
    grid-template-areas: "dots" "icon";
  }
  &.--dots-bottom .icon-graph-tile__front {
    grid-template-areas: "icon" "dots";
  }
}

.icon-graph-tile__front {
  width: inherit;
  height: inherit;
  position: absolute;
  background: #FFF;
  color: black;
  z-index: 3;
  display: grid;
  position: relative;
  border-radius: var(--tile-radius);
  grid-template-columns: 1fr 1fr;
  /* box-shadow: -2px -2px 10px rgba(0,0,0,.4); */
  border: 1px solid #111;
  border: 1px solid var(--tile-edge-color);
}
.icon-graph-tile__back {
  /* rounded corner 3d color */
  background: #CCC;
  width: inherit;
  height: inherit;
  position: absolute;
  margin-left: calc(-1 * var(--tile-thickness));
  margin-top: calc(-1 * var(--tile-thickness));
  z-index: 2;
  border: 1px solid var(--tile-edge-color);
  border-radius: var(--tile-radius);
  border-top-right-radius: calc(1.5 * var(--tile-radius));
  border-bottom-left-radius: calc(1.5 * var(--tile-radius));

  /* 3d top face */
  &:before {
    content: '';
    background: #FFF;
    top: -1px;
    left: calc(1.5 * var(--tile-thickness));
    right: calc(-.25 * var(--tile-thickness));
    height: calc(1.5 * var(--tile-thickness));
    border-top-right-radius: 2px;
    position: absolute;
    transform: skewX(45deg);
    border-right: 1px solid var(--tile-edge-color);
    border-top: 1px solid var(--tile-edge-color);
  }
  /* 3d left face */
  &:after {
    content: '';
    background: #999;
    left: -1px;
    top: calc(1.5 * var(--tile-thickness));
    bottom: calc(-.25 * var(--tile-thickness));
    width: calc(1.5 * var(--tile-thickness));
    border-bottom-left-radius: 2px;
    position: absolute;
    transform: skewY(45deg);
    border-bottom: 1px solid var(--tile-edge-color);
    border-left: 1px solid var(--tile-edge-color);
  }
}
.icon-graph-tile__shadow {
  height: calc(1.1 * var(--tile-thickness));
  position: absolute;
  bottom: 1px;
  left: calc(var(--tile-radius)/4);
  right: calc(var(--tile-thickness) / 2);
  box-shadow: calc(-.07 * var(--tile-width)) 1px 4px rgba(0,0,0,.6);
  transform: skewX(45deg);
  z-index: 1;
}


.icon-graph-tile__line {
  position: absolute;
  height: 80%;
  width: 1px;
  background: black;
  left: 50%;
  top: 10%;
  opacity: .5;
}
.icon-graph-tile__icon {
  grid-area: icon;
  height: 100%;
  display: block;
  padding: 15%;
  svg {
    color: currentColor;
    height: 100%;
    width: 100%;
  }
}
.icon-graph-tile__dot-wrap {
  grid-area: dots;
  padding: 10%;
  /* display: grid;
  align-items: center;
  justify-content: center; */
  position: relative;
}
.icon-graph-tile__dot {
  width: 10px;
  height: 10px;
  /* border-top-right-radius: 50%;
  border-bottom-right-radius: 50%; */
  border-radius: 50%;
  background: currentColor;
  opacity: .8
}
</style>
