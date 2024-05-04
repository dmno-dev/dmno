<template>
  <div :class="['dots-loader', `dots-loader--${counter+1}`]">
    <div
      v-for="(_p, i) in POSITION_STEPS"
      :key="i"
      :style="dotStyles[i]"
    />
  </div>
</template>


<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

const props = defineProps({
  autoPlay: { type: Boolean },
});


const TIC_SEC_MS = 1.1 * 1000;
const OFFSET = 25;

// map cardinal direction to positions (slightly easioer to reason about)
const DOT_POSITION_NAMES = {
  NW: [-1, -1],
  NE: [1, -1],
  W: [-1, 0],
  O: [0, 0],
  E: [1, 0],
  SW: [-1, 1],
  SE: [1, 1],
};
type PositionNames = keyof typeof DOT_POSITION_NAMES;

const POSITION_STEPS: Array<Array<PositionNames>> = [
  ['O'],
  ['NE', 'SW'],
  ['SE', 'NW', 'O'],
  ['SW', 'NE', 'SE', 'NW'],
  ['NW', 'SE', 'SW', 'NE', 'O'],
  ['NE', 'SW', 'W', 'E', 'NW', 'SE'],
];


const NUM_POSITIONS = POSITION_STEPS.length;

const counter = ref(0);
onMounted(() => {
  if (props.autoPlay) setTimeout(start, TIC_SEC_MS);
});

let ticInterval: ReturnType<typeof setInterval> | undefined;
function start() {
  counter.value++;
  ticInterval = setInterval(() => {
    counter.value = (counter.value + 1) % NUM_POSITIONS;
  }, TIC_SEC_MS);
}
function stop() {
  counter.value = 0;
  clearInterval(ticInterval);
}

const dotStyles = computed(() => {
  const styles = [];
  for (let i = 0; i < NUM_POSITIONS; i++) {
    const pName = POSITION_STEPS[counter.value][i <= counter.value ? i : 0];
    const [offsetX, offsetY] = DOT_POSITION_NAMES[pName];
    styles.push({
      transform: `translate(${OFFSET * offsetX}cqb, ${OFFSET * offsetY}cqb)`,
    });
  }
  return styles;
});

defineExpose({ start, stop });

</script>


<style scoped lang="less">
.dots-loader {
  color: currentColor;
  // background: black;
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;

  --dot-size: 18%;

  &.dots-loader--1 {
    --dot-size: 25%;
  }


  > div {
    width: var(--dot-size);
    height: var(--dot-size);
    border-radius: 50%;
    background: currentColor;
    position: absolute;
    transition: transform 1s, width 1s, height 1s;
  }
}
</style>
