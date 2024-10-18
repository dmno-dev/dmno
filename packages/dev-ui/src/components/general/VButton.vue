<template lang="pug">
button.v-button(@click="(e) => emit('click', e)")
  slot {{ label }}
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue';

const props = defineProps<{
  label?: string
}>();

const emit = defineEmits(['click']);

</script>

<style scoped>
.v-button {
  cursor: pointer;
  border: 1px solid white;
  padding: 2px 8px;
}
</style>
