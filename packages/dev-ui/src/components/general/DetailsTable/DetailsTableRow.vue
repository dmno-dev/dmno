<template lang="pug">
.details-table-row(:class="computedClasses")
  .details-table-row__label
    slot(name="label") {{ label }}
  .details-table-row__content
    slot
</template>


<script setup lang="ts">
import { computed, type PropType } from 'vue';

const props = defineProps<{
  label?: string
}>();

const computedClasses = computed(() => ({
}));

</script>

<style scoped>
.details-table-row {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
}
.details-table-row__label {
  padding-right: 8px;
  /* padding-left: 4px; */
  font-weight: bold;
  /* justify-self: end; */

  /* this would fix top alignment if contents have a normal line heihgt */
  /* align-self: baseline;  */

}
</style>
