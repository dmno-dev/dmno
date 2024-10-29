<template lang="pug">
.sidebar
  GraphOutlineItem(
    v-if="rootService"
    :item="rootService"
  )
  div(v-else) loading...
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWorkspaceStore } from '@/store/workspace.store';
import GraphOutlineItem from './GraphOutlineItem.vue';

const workspaceStore = useWorkspaceStore();
const rootService = computed(() => workspaceStore.rootService);

</script>
