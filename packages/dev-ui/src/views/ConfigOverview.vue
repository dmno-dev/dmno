<template>
  <div>
    <h1>DMNO Config</h1>

    <div>
      Loading...
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useRoute, useRouter } from 'vue-router';

const store = useWorkspaceStore();

const services = computed(() => store.servicesById);
const rootService = computed(() => store.rootService);

const router = useRouter();

function redirectToRootConfig() {
  console.log(rootService.value);
  if (rootService.value) {
    router.replace({ name: 'config-service-detail', params: { serviceId: rootService.value.id }})
  }
}

watch(services, redirectToRootConfig, { immediate: true });

</script>
