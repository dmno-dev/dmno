import * as _ from 'es-toolkit';
import { defineStore } from 'pinia';

import { addStoreHooks } from './plugins/pinia-hooks-plugin';
import { useRealtimeStore } from './realtime.store';
import type {
  SerializedWorkspace, SerializedService, SerializedConfigItem, SerializedDmnoPlugin,
  SerializedResolver,
} from 'dmno';


export function getActiveResolvers(n: SerializedConfigItem) {
  let currentResolver = n.resolver;
  const activeResolvers: Array<SerializedResolver> = [];
  while (currentResolver) {
    activeResolvers.push(currentResolver);
    currentResolver = currentResolver.branches?.find((b) => b.isActive)?.resolver;
  }
  return activeResolvers;
}

export const useWorkspaceStore = () => {
  return addStoreHooks(
    // currently this store is only dealing with fix history on head, so no need to involve a changeset
    defineStore('workspace', {
      state: () => ({
        servicesById: {} as Record<string, SerializedService>,
        pluginsById: {} as Record<string, SerializedDmnoPlugin>,
        nodesById: {} as Record<string, SerializedConfigItem>,
      }),
      getters: {
        rootService: (state) => Object.values(state.servicesById).find((s) => !s.parentId),
        services: (state) => Object.values(state.servicesById),
        servicesByParentId: (state) => {
          return _.groupBy(Object.values(state.servicesById), (s) => s.parentId || '');
        },
      },

      async onActivated() {
        const realtimeStore = useRealtimeStore();
        realtimeStore.socket.on('workspace-update', (data: SerializedWorkspace) => {
          // console.log('workspace update!', data);
          this.servicesById = _.keyBy(Object.values(data.services), (s) => s.id);
          this.pluginsById = _.keyBy(Object.values(data.plugins), (p) => p.instanceId);

          function extractChildNodes(n: SerializedConfigItem): Array<SerializedConfigItem> {
            return [
              n,
              ..._.flatMapDeep(Object.values(n.children), extractChildNodes),
            ];
          }

          const serviceNodes = _.flatMapDeep(Object.values(data.services), (s) => (
            Object.values(s.configNodes).map((n) => extractChildNodes(n))
          ));
          const pluginNodes = _.flatMapDeep(Object.values(data.plugins), (p) => (
            _.flatMap(Object.values(p.inputNodes), (n) => extractChildNodes(n))
          ));

          this.nodesById = _.keyBy([...serviceNodes, ...pluginNodes], (n) => n.id);
        });
      },

    }),
  )();
};

