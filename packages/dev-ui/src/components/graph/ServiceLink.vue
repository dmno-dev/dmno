/*
  NOTE - might want to unify with PluginLink?
*/
<template lang="pug">
RouterLink.service-link(
  :to="{ name: 'config-service-detail', params: { serviceId: props.id } }"
)
  //- Icon.service-link__plug(full-name='ion:cube-sharp')
  Icon.service-link__icon(:full-name="service.icon || 'zondicons:plugin'" size='m')
  | {{ service.id }}
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
const service = computed(() => workspaceStore.servicesById[props.id]);

</script>

<style scoped>
.service-link {
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
  /* margin-left: 10px; */
  padding-right: 10px;
  text-wrap: nowrap;
  &:hover {
    --current-bg: var(--bg-2);
  }
}
.service-link__icon {
  flex-shrink: 0;
}
.service-link__plug {
  color: var(--current-bg);
  /* color: red; */
  position: absolute;
  /* width: 28px; */
  left: -18px;
  top: 0;
  height: 100%;
  /* background: blue; */
  transform: rotate(-90deg) scale(.7)
}
</style>
