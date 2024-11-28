<script setup lang="ts">
import AnimatedDot from './AnimatedDot.vue'
import { computed } from 'vue'

const activeColor = 'rgb(155 86 245)'; // BRAND PURPLE
const inactiveColor = 'rgb(209 213 219)';

const props = defineProps<{
  x1: number
  y1: number
  x2: number
  y2: number
  active?: boolean
}>()

const coordinates = computed(() => ({
  x1: props.x1,
  y1: props.y1,
  x2: props.x2,
  y2: props.y2
}))
</script>

<template>
  <g>
    <line
      :x1="coordinates.x1"
      :y1="coordinates.y1"
      :x2="coordinates.x2"
      :y2="coordinates.y2"
      :stroke="active ? activeColor : inactiveColor"
      stroke-width="2"
      :class="{ 'transition-colors duration-300': true }"
    />
    <AnimatedDot 
      v-if="active"
      v-bind="coordinates"
    />
  </g>
</template>
