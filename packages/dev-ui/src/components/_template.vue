<template lang="pug">
.component-name hi!
</template>

<script setup lang="ts">
import { useWorkspaceStore } from '@/store/workspace.store';
import { ref, computed, type PropType } from 'vue';

const workspaceStore = useWorkspaceStore();

const services = computed(() => workspaceStore.services);

</script>

<style scoped>
.component-name {
  
}
</style>
