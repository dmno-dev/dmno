<template>
  <div
    class="dmno-tile-logo"
    @mouseenter="!autoPlay ? dotsRef?.start() : undefined"
    @mouseleave="!autoPlay ? dotsRef?.stop() : undefined"
  >
    <div class="dmno-tile-logo__dots-wrap">
      <DotsLoader
        ref="dotsRef"
        :auto-play="autoPlay"
      />
    </div>
    <div class="dmno-tile-logo__d-wrap">
      <div class="dmno-tile-logo__d" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DotsLoader from './DotsLoader.vue';

defineProps<{
  autoPlay?: boolean,
}>();
const dotsRef = ref<InstanceType<typeof DotsLoader>>();

</script>

<style lang="less" is:global>
.dmno-tile-logo {
  color: white;
  position: relative;
  width: 100%;
  max-height: 100%;
  aspect-ratio: 2/1;

  --border-radius-pct: 10%;
  // > div {
  //   width: 50%;
  //   height: 100%;
  //   position: relative;
  // }
}

.dmno-tile-logo__dots-wrap {
  background: black;
  border-top-left-radius: var(--border-radius-pct);
  border-bottom-left-radius: var(--border-radius-pct);
  position: absolute;
  width: 50%;
  height: 100%;
  padding: 2%;

  &:after {
    content: '';
    position: absolute;
    display: block;
    width: 2px;
    margin-right: -1px;
    height: calc(100% - 2 * var(--border-radius-pct));
    background: white;
    opacity: 50%;
    top: var(--border-radius-pct);
    right: 0;
  }
}
.dmno-tile-logo__d-wrap {
  position: absolute;
  background: black;
  border-top-right-radius: var(--border-radius-pct);
  border-bottom-right-radius: var(--border-radius-pct);
  left: 50%;
  width: 50%;
  height: 100%;
  padding: 16%;
}


.dmno-tile-logo__d {
  width: 100%;
  height: 100%;

  border-radius: 5% 50% 50% 5%;
  margin-left: 3%;
  background: white;
  // background: linear-gradient(35deg, var(--logo-color-1) 0%, var(--logo-color-2) 100%);
}

// .dmno-tile-logo {
//   @property --logo-color-1 {
//     syntax: '<color>';
//     inherits: true;
//     initial-value: white;
//   }
//   @property --logo-color-2 {
//     syntax: '<color>';
//     inherits: true;
//     initial-value: white;
//   }
//   transition: --logo-color-1 .5s, --logo-color-2 .5s;
// }
// .dmno-tile-logo:has(.dots-loader--1) {
//   --logo-color-1: var(--brand-cyan);
//   --logo-color-2: var(--brand-pink);
// }
// .dmno-tile-logo:has(.dots-loader--2) {
//   --logo-color-1: var(--brand-orange);
//   --logo-color-2: var(--brand-red);
// }
// .dmno-tile-logo:has(.dots-loader--3) {
//   --logo-color-1: var(--brand-purple);
//   --logo-color-2: var(--brand-cyan);
// }
// .dmno-tile-logo:has(.dots-loader--4) {
//   --logo-color-1: var(--brand-green);
//   --logo-color-2: var(--brand-yellow);
// }
// .dmno-tile-logo:has(.dots-loader--5) {
//   --logo-color-1: var(--brand-pink);
//   --logo-color-2: var(--brand-blue);
// }
// .dmno-tile-logo:has(.dots-loader--6) {
//   --logo-color-1: var(--brand-purple);
//   --logo-color-2: var(--brand-orange);
// }
</style>
