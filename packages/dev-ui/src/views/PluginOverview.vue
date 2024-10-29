<!-- eslint-disable vue/no-multiple-template-root -->
<template lang="pug">
#sidebar
  GraphOutline
#main
  template(v-if="!selectedPlugin")
    h2 Invalid plugin ID
    p Plugin {{ urlPluginId }} does not exist!

  template(v-else)
    h2 Plugin Details: {{ urlPluginId }}
    section
      DetailsTable
        DetailsTableRow(label="Parent")
          ServiceLink(:id="parentService.id")
        DetailsTableRow(v-if="selectedPlugin.injectedByEntityIds.length" label="Injected into")
          .service-list
            ServiceLink(
              v-for="serviceId in selectedPlugin.injectedByEntityIds" :id="serviceId"
              :key="serviceId"
            )
        DetailsTableRow(label="Plugin type") {{ selectedPlugin.pluginType }}
        DetailsTableRow(label="Package")
          .package-metadata(v-if="selectedPlugin.packageMetadata")
            a.package-metadata__npm(
              :href="`https://www.npmjs.com/package/${selectedPlugin.packageMetadata.name}`"
              target="_blank"
            )
              Icon.package-metadata__npm-icon(name="npm" size="m")
              .package-metadata__name {{ selectedPlugin.packageMetadata.name }}
              //- .package-metadata__at @
              .package-metadata__version v{{ selectedPlugin.packageMetadata.version }}
            a(:href="selectedPlugin.packageMetadata.repositoryUrl" target="_blank")
              Icon(name="git")
            a(:href="selectedPlugin.packageMetadata.websiteUrl" target="_blank")
              Icon(name="website")


    br
    section
      h3 Plugin Inputs
      a(href="#" @click.prevent="openEditorToFile(`${parentService.path}/.dmno/config.mts`)") edit init config

      div
        ConfigNode(
          v-for="node in selectedPlugin.inputNodes" :id="node.id"
          :key="node.key"
        )
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useHead } from '@unhead/vue';
import { useWorkspaceStore } from '@/store/workspace.store';
import ConfigNode from '@/components/graph/ConfigNode.vue';
import GraphOutline from '@/components/sidebar/GraphOutline.vue';
import ErrorMessage from '@/components/general/ErrorMessage.vue';
import { openEditorToFile } from '@/store/realtime.store';
import ServiceLink from '@/components/graph/ServiceLink.vue';
import Icon from '@/components/general/Icon.vue';
import DetailsTable from '@/components/general/DetailsTable/DetailsTable.vue';
import DetailsTableRow from '@/components/general/DetailsTable/DetailsTableRow.vue';

const store = useWorkspaceStore();

const route = useRoute();
const urlPluginId = computed(() => route.params.pluginId as string);

const selectedPlugin = computed(() => store.pluginsById[urlPluginId.value]);

const parentService = computed(() => store.servicesById[selectedPlugin.value?.parentEntityId]);
// const injectingServices = computed(() => selectedPlugin.value.used

// store.servicesById[selectedPlugin.value?.parentEntityId]);

useHead({
  title: () => `Plugin details: ${selectedPlugin.value?.instanceId || 'loading'}`,
});


</script>

<style scoped>
.service-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.package-metadata {
  display: flex;
  gap: 8px;
  align-items: center;
  line-height: 1cap;
  > a {
    color: inherit;
    & :deep(.d-icon) {
      height: 2cap;
    }
  }
}
.package-metadata__npm {
  height: 24px;
  font-size: 13px;
  background: var(--bg-3);
  border-radius: 4px;
  display: flex;
  align-items: center;

  &:hover {
    opacity: .85;
  }

  .package-metadata__npm-icon {
    height: 100%;
    margin-left: 4px;
  }

  > div {
    padding: 0 8px;
    /* border-right: 1px solid white; */
    /* background: var(--brand-blue); */
    height: inherit;
    display: flex;
    align-items: center;
    border-radius: 4px;
    &:first-child {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
    &:last-child {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      background: var(--brand-blue);
    }
  }
}

</style>
