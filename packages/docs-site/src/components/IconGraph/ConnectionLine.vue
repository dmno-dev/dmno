<script setup lang="ts">
import AnimatedDot from './AnimatedDot.vue'

const activeColor = 'rgb(155 86 245)'; // BRAND PURPLE
const inactiveColor = 'rgb(209 213 219)';


defineProps<{
  x1: number
  y1: number
  x2: number
  y2: number
  active?: boolean
}>()
</script>

<template>
  <g>
    <line
      :x1="x1"
      :y1="y1"
      :x2="x2"
      :y2="y2"
      :stroke="active ? activeColor : inactiveColor"
      stroke-width="2"
      :class="{ 'transition-colors duration-300': true }"
    />
    <AnimatedDot 
      v-if="active"
      :x1="x1" 
      :y1="y1" 
      :x2="x2" 
      :y2="y2" 
    />
  </g>
</template>
