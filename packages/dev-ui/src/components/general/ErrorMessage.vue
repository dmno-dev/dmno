<template lang="pug">
.error-message
  h3.error-message__title
    Icon.error-message__icon(full-name="mdi:alert" size="l")
    slot(name="title") {{ props.title }}
  .error-message__message
    slot {{ props.message }}
  .error-message__stack
    slot
      div(
        v-for="stackLine, i in processedStackLines" :key="i"
      )
        | at {{ stackLine.name }}
        =' '
        a(href="#" @click.prevent="openEditorToFile(stackLine.file)") {{ stackLine.file }}
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue';
import { openEditorToFile } from '@/store/realtime.store';
import Icon from './Icon.vue';

const props = defineProps<{
  title?: string,
  message?: string,
  stack?: Array<string>
}>();

const processedStackLines = computed(() => props.stack?.map((line) => {
  const [_at, nameOrFile, onlyFile] = line.trim().split(' ');
  let file = onlyFile || nameOrFile;
  const name = onlyFile ? nameOrFile : undefined;
  if (file.startsWith('(')) file = file.substring(1, file.length - 1);
  file = file.replace(/file:\/\//, '');
  return { name, file };
}));


</script>

<style scoped>
.error-message {
  border: 1px solid var(--error-red-border);
  padding: 8px;
  background: color-mix(in srgb, var(--error-red-text), transparent 90%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.error-message__title {
  display: flex;
  gap: 8px;
}

.error-message__stack {
  padding-left: 2cap;
}
</style>
