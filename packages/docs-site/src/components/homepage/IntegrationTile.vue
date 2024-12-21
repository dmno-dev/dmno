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
  --tile-shadow-color: #999;
  --tile-edge-color: #555;

  width: var(--tile-width);
  height: calc(var(--tile-width) / 2);

  border-radius: var(--tile-radius);
  position: relative;
  /* box-shadow: -3px -3px 0 var(--shadow-color); */

  z-index: 2;

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
  border-radius: inherit;
  grid-template-columns: 1fr 1fr;
  /* box-shadow: -2px -2px 10px rgba(0,0,0,.4); */
  border: 1px solid #111;
  border: 1px solid var(--tile-edge-color);
}
.icon-graph-tile__back {
  width: inherit;
  height: inherit;
  background: var(--tile-shadow-color);
  position: absolute;
  margin-left: calc(-1 * var(--tile-thickness));
  margin-top: calc(-1 * var(--tile-thickness));
  z-index: 2;
  border-radius: inherit;
  /* rounded corner 3d color */
  background: #CCC;
  border: 1px solid var(--tile-edge-color);

  /* 3d top face */
  &:before {
    content: '';
    /* right: calc(-.2 * var(--tile-radius)); */

    top: 0;
    left: calc(var(--tile-thickness) + var(--tile-radius) / 2);
    right: calc(-.25 * var(--tile-thickness));
    height: calc(var(--tile-thickness));
    border-top-right-radius: 2px;
    /* background: var(--tile-shadow-color); */
    position: absolute;
    transform: skewX(45deg);
    /* box-shadow: inset 0px -4px 4px rgba(0,0,0,.3); */
    background: #FFF;
    /* border-top: 1px solid var(--tile-edge-color); */
    border-right: 1px solid var(--tile-edge-color);
  }
  /* 3d left face */
  &:after {
    content: '';
    left: 0;
    top: calc(var(--tile-thickness) + var(--tile-radius) / 2);
    bottom: calc(-.25 * var(--tile-thickness));
    width: calc(var(--tile-thickness));
    border-bottom-left-radius: 2px;
    background: #999;
    position: absolute;
    transform: skewY(45deg);
    /* border-left: 1px solid var(--tile-edge-color); */
    border-bottom: 1px solid var(--tile-edge-color);
    /* box-shadow: inset -4px 0px 4px rgba(0,0,0,.3); */
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
