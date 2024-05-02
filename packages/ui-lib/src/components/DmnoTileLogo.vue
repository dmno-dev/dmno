<template>
  <div
    class="dmno-tile-logo"
    @mouseenter="!autoPlay ? dotsRef?.start() : undefined"
    @mouseleave="!autoPlay ? dotsRef?.stop() : undefined"
  >
    <div class="dmno-tile-logo__dots-wrap">
      <DotsLoader
        ref="dotsRef"
        :no-auto-play="!autoPlay"
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

<style lang="less">
.dmno-tile-logo {
  color: white;
  position: relative;
  // width: 200%;
  height: 100%;
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
  padding: 14%;
}
.dmno-tile-logo__d {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 0% 50% 50% 0%;
  margin-left: 3%;
}
</style>
