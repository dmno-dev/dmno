<script setup lang="ts">
defineProps<{
  x1: number
  y1: number
  x2: number
  y2: number
}>()
</script>

<template>
  <circle r="4" fill="#6366f1">
    <animateMotion
      dur="2s"
      repeatCount="indefinite"
      :path="`M${x1},${y1} L${x2},${y2}`"
    />
    <animate
      attributeName="opacity"
      values="0;1;0"
      dur="2s"
      repeatCount="indefinite"
    />
  </circle>
</template>
