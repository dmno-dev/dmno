/*
  NOTE - might want to unify with ServiceLink?
*/
<template lang="pug">
RouterLink.plugin-link(
  :to="{ name: 'config-plugin-detail', params: { pluginId: props.id } }"
)
  Icon.plugin-link__plug(full-name='mingcute:plugin-fill')
  Icon.plugin-link__icon(:full-name="plugin.icon || 'zondicons:plugin'" size='m')
  | {{ plugin.instanceId }}
</template>

<script setup lang="ts">
import { useWorkspaceStore } from '@/store/workspace.store';
import { ref, computed, type PropType } from 'vue';
import Icon from '../general/Icon.vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  id: string,
}>();

const workspaceStore = useWorkspaceStore();
const plugin = computed(() => workspaceStore.pluginsById[props.id]);

</script>

<style scoped>
.plugin-link {
  --current-bg: var(--bg-3);

  font-weight: bold;
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
  background: var(--current-bg);
  padding: 4px 10px 4px 6px;
  line-height: 1cap;
  border-radius: 3px;
  width: max-content;
  text-decoration: none;
  color: unset;
  /* margin-left: 15px; */
  margin-left: 10px;
  padding-right: 10px;
  &:hover {
    --current-bg: var(--bg-2);
  }
}
.plugin-link__icon {
  flex-shrink: 0;
}
.plugin-link__plug {
  color: var(--current-bg);
  /* color: red; */
  position: absolute;
  /* width: 28px; */
  left: -14px;
  top: 0;
  height: 100%;
  /* background: blue; */
  transform: rotate(-90deg);
}
</style>
