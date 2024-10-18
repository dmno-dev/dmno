<template lang="pug">
.scroll-area
  .scroll-area__top(v-if="$slots.top")
    slot(name='top')
  .scroll-area__main
    slot
  .scroll-area__bottom(v-if="$slots.top")
    slot(name='bottom')
</template>

<script setup lang="ts">
</script>

<style scoped>
.scroll-area {
  inset: 0;
  position: absolute;
  display: flex;
  flex-direction: column;
}
.scroll-area__main {
  overflow: auto;
  flex-grow: 1;
}
.scroll-area__top, .scroll-area__bottom {
  flex-shrink: 0;
}
</style>
