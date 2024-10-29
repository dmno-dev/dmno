<!-- eslint-disable vue/no-multiple-template-root -->
<template lang="pug">
#sidebar
  GraphOutline
#main
  template(v-if="!selectedService")
    h2 Invalid service ID
    p Service {{ urlServiceId }} does not exist!

  template(v-else)
    h2 Service details {{ urlServiceId }}
    section
      DetailsTable
        DetailsTableRow(label="Package name") {{ selectedService.packageName }}
        DetailsTableRow(label="Path") {{ selectedService.path }}
        DetailsTableRow(v-if="selectedService.ownedPluginIds.length" label="Plugins (owned)")
          .plugin-list
            PluginLink(
              v-for="pluginId in selectedService.ownedPluginIds" :id="pluginId"
              :key="pluginId"
            )
        DetailsTableRow(v-if="selectedService.injectedPluginIds.length" label="Plugins (injected)")
          .plugin-list
            PluginLink(
              v-for="pluginId in selectedService.injectedPluginIds" :id="pluginId"
              :key="pluginId"
            )

    div(v-if="selectedService.configLoadError")
      ErrorMessage(
        title="Error loading your service config"
        :message="selectedService.configLoadError.message"
        :stack="selectedService.configLoadError.cleanedStack"
      )
    template(v-else)
      br
      section
        h3 Config
        a(href="#" @click.prevent="openEditorToFile(`${selectedService.path}/.dmno/config.mts`)") edit config.mts

        div
          ConfigNode(
            v-for="node in selectedService.configNodes" :id="node.id"
            :key="node.key"
          )
#details
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@unhead/vue';
import { useWorkspaceStore } from '@/store/workspace.store';
import ConfigNode from '@/components/graph/ConfigNode.vue';
import GraphOutline from '@/components/sidebar/GraphOutline.vue';
import ErrorMessage from '@/components/general/ErrorMessage.vue';
import { openEditorToFile } from '@/store/realtime.store';
import PluginLink from '@/components/graph/PluginLink.vue';
import DetailsTable from '@/components/general/DetailsTable/DetailsTable.vue';
import DetailsTableRow from '@/components/general/DetailsTable/DetailsTableRow.vue';

const store = useWorkspaceStore();

const route = useRoute();
const urlServiceId = computed(() => route.params.serviceId as string);

const selectedService = computed(() => store.servicesById[urlServiceId.value]);

useHead({
  title: () => `Service details: ${selectedService.value?.id || 'loading'}`,
});


</script>

<style scoped>
.plugin-list {
  display: flex;
  flex-wrap: wrap;
  column-gap: 8px;
  row-gap: 4px;
  margin-bottom: 8px;
}
</style>
