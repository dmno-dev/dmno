<template lang="pug">
.graph-outline-item(:class="rootComputedClasses")
  RouterLink.graph-outline-item__wrap(
    :class="computedClasses"
    :to="{ name: 'config-service-detail', params: { serviceId: item.id }}"
  )
    .graph-outline-item__left
      Icon.graph-outline-item__type-icon(:full-name="service.icon")
    .graph-outline-item__label {{ item.id }}
    .graph-outline-item__right
      Icon.graph-outline-item__status-icon(:full-name="statusIconName")
  .graph-outline-item__children
    GraphOutlineItem(
      v-for="childItem in childServices"
      :key="childItem.id"
      :item="childItem"
      :depth="depth + 1"
    )

</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { RouterLink } from 'vue-router';
import { useWorkspaceStore } from '@/store/workspace.store';
import Icon from '../general/Icon.vue';
import GraphOutlineItem from './GraphOutlineItem.vue'; // eslint-disable-line import/no-self-import

const props = defineProps({
  item: { type: Object as PropType<any>, required: true },
  depth: { type: Number, default: 0 },
});

const workspaceStore = useWorkspaceStore();
const service = computed(() => workspaceStore.servicesById[props.item.id]);
const childServices = computed(() => workspaceStore.servicesByParentId[props.item.id]);

const rootComputedClasses = computed(() => ({
}));

const computedClasses = computed(() => ({
  '--invalid': !service.value.isValid,
}));

const statusIconName = computed(() => {
  // TODO: figure out what icons we want to use for different kinds of errors
  if (service.value.configLoadError) return 'mdi:alert-circle';
  if (service.value.schemaErrors?.length) return 'mdi:minus-circle';
  if (service.value.isValid) return 'mdi:check-circle';
  return 'mdi:cancel-circle';
});

</script>

<style>
.graph-outline-item {
  border-left: 1px solid #000;
}

.graph-outline-item__wrap {
  --outline-item-height: 36px;

  display: grid;
  grid-template-columns: min-content auto min-content;
  gap: 4px;
  min-height: var(--outline-item-height);
  border-bottom: 1px solid black;
  cursor: pointer;
  background: var(--bg-1);
  &:hover {
    background: var(--bg-2);
  }

  text-decoration: none;
  color: inherit;

  &.--invalid {
    .graph-outline-item__status-icon {
      color: var(--error-red-text);
    }

  }
}



.graph-outline-item__children {
  /* border-left: 1px solid #000; */
  padding-left: 5px;
  background: var(--brand-purple);
}



.graph-outline-item__left, .graph-outline-item__right {
  display: grid;
  justify-items: center;
  align-items: center;
  padding: 12px;
}
.graph-outline-item__label {
  font-size: 14px;
  font-weight: bold;
  align-self: center;
}

.graph-outline-item__type-icon, .graph-outline-item__status-icon {
  width: 18px;
}
.graph-outline-item__status-icon {
  /* height: 30px; */
  color: var(--success-green-text);
}

</style>
