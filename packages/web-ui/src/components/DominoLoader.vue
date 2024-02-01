<template>
  <div class="dots-loader">
    <div v-for="(_p, i) in POSITION_STEPS" :style="dotStyles[i]"/>
  </div>
</template>


<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';


const TIC_SEC = 1.1;
const OFFSET = 25;

// map cardinal direction to positions (slightly easioer to reason about)
const DOT_POSITION_NAMES = {
  NW: [-1, -1],
  NE: [1, -1],
  W: [-1,0],
  O: [0,0],
  E: [1,0],
  SW: [-1,1],
  SE: [1,1],
};
type PositionNames = keyof typeof DOT_POSITION_NAMES;

const POSITION_STEPS: PositionNames[][] =[
  ['O'],
  ['NE','SW'],
  ['SE','NW', 'O'],
  ['SW','NE','SE','NW' ],
  ['NW','SE','SW','NE','O'],
  ['NE','SW','W','E','NW','SE'],
];


const NUM_POSITIONS = POSITION_STEPS.length;

const counter = ref(0);
onMounted(() => {
  setInterval(() => {
    counter.value = (counter.value + 1) % NUM_POSITIONS;
  }, 1000 * TIC_SEC);
});

const dotStyles = computed(() => {
  const styles = [];
  for (let i  = 0; i < NUM_POSITIONS; i++) {
    const pName = POSITION_STEPS[counter.value][i <= counter.value ? i : 0];
    const [ offsetX, offsetY ] = DOT_POSITION_NAMES[pName];
    styles.push({
      transform: `translate(${OFFSET * offsetX}cqb, ${OFFSET * offsetY}cqb)`,
    });
  }
  return styles;
})

</script>


<style scoped lang="less">
.dots-loader {
  color: currentColor;
  // background: black;
  width: 100px;
  height: 100px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;


  > div {
    width: 15%;
    height: 15%;
    border-radius: 50%;
    background: currentColor;
    position: absolute;
    transition: transform 1s;
  }
}
</style>
