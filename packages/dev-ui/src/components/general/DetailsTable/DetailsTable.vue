<template lang="pug">
.details-table(:class="computedClasses")
  slot
</template>


<script setup lang="ts">
import { computed, type PropType } from 'vue';

const props = defineProps<{
}>();

const computedClasses = computed(() => ({

}));

</script>

<style scoped>
.details-table {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
}
</style>
