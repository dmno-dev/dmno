<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  x1: number
  y1: number
  x2: number
  y2: number
}>()

const path = computed(() => `M${props.x1},${props.y1} L${props.x2},${props.y2}`)
</script>

<template>
  <circle r="4" fill="#6366f1">
    <animateMotion
      dur="2s"
      repeatCount="indefinite"
      :path="path"
    />
    <animate
      attributeName="opacity"
      values="0;1;0"
      dur="2s"
      repeatCount="indefinite"
    />
  </circle>
</template>
