<template lang="pug">
span.styled-value(:class="computedClasses")
  span(v-if="valIsString && showQuotes !== false") "
  | {{ valueText }}
  span(v-if="valIsString && showQuotes !== false") "
</template>

<script setup lang="ts">
import {
  isBoolean, isPlainObject, isNumber, isString,
} from '@sindresorhus/is';
import { computed } from 'vue';

const props = defineProps<{
  value: any,
  showQuotes?: boolean,
}>();

const valIsString = computed(() => isString(props.value));

const computedClasses = computed(() => ({
  '--string': valIsString.value,
  '--number': isNumber(props.value),
  '--boolean': isBoolean(props.value),
  '--object': isPlainObject(props.value),
  '--undefined': props.value === undefined,
}));

const valueText = computed(() => {
  if (props.value === undefined) return 'empty';
  return props.value;
});

</script>

<style scoped>
.styled-value {
  font-family: var(--code-font);

  &.--undefined {
    opacity: .4;
    font-style: italic;
  }
  &.--boolean {
    /* color: var(--brand-yellow); */
    font-style: italic;
  }
  &.--number {
    font-style: italic;
    /* color: var(--brand-pink); */
  }
  &.--object {
    font-style: italic;
  }
}
</style>
