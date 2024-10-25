<template lang="pug">
.config-node(:class="rootComputedClasses")
  .config-node__node(:class="computedClasses")
    //- Icon.config-node__sensitive-icon(v-if="node.isSensitive" name='sensitive')
    .config-node__left
      Icon.config-node__type-icon(
        :full-name="node.dataType.ui?.icon"
        :tooltip="typeTooltip"
      )
      //- TODO: this isnt quite right, currently only showing 2 levels, but it can be more
      Icon.config-node__resolver-chain-icon(
        v-if="activeResolvers.length > 1"
        :full-name="activeResolvers[0].icon"
        :tooltip="activeResolvers[0].label"
      )
      Icon.config-node__resolver-icon(
        :full-name="resolverIcon"
        :tooltip="resolverTooltip"
      )
    .config-node__center
      .config-node__label
        .config-node__label-text._truncate {{ node.key }}
        Icon.config-node__sensitive-icon2(v-if="node.isSensitive" name="sensitive" tooltip="sensitive")
        Icon.config-node__required-icon(v-if="node.dataType.required" name="required" tooltip="required")
        Icon.config-node__help-icon(v-if="node.dataType.summary" name="help" :tooltip="node.dataType.summary")

      .config-node__raw-value._truncate(
        v-if="node.isResolved && node.isCoerced"
      )
        //- Icon.config-node__coerced-icon(full-name="game-icons:transform" size="xs")
        | Raw Value:&nbsp;
        StyledValue(:value="node.maskedResolvedRawValue || node.resolvedRawValue")
      .config-node__value._truncate
        StyledValue(:value="node.maskedResolvedValue || node.resolvedValue")
      .config-node__errors(v-if="nodeErrors.length")
        div(v-for="err in nodeErrors" :key="err.type") {{ err.icon }} {{ err.message }}
      div {{ node.overrides }}
    .config-node__right
      //- Icon.config-node__resolver-icon(:full-name='node.resolver?.icon')
      //- Icon.config-node__status-icon(full-name='mdi:cancel-circle')
    Icon.config-node__collapse-toggle(
      v-if="hasChildren"
      name="chevron"
      @click="onClick"
    )
  .config-node__children
    //- div(v-for="childNode of node.children" :key="childNode.id") {{ childNode.id }}
    ConfigNode(v-for="childNode of node.children" :id="childNode.id" :key="childNode.id")

</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { compact } from 'es-toolkit';
import { getActiveResolvers, useWorkspaceStore } from '@/store/workspace.store';
import Icon from '../general/Icon.vue';
import StyledValue from '../general/StyledValue.vue';

// eslint-disable-next-line import/no-self-import
import ConfigNode from './ConfigNode.vue';

const workspaceStore = useWorkspaceStore();

const props = defineProps({
  id: { type: String, required: true },
});

const node = computed(() => workspaceStore.nodesById[props.id]);

const nodeErrors = computed(() => compact([
  ...node.value.schemaErrors || [],
  node.value.resolutionError,
  node.value.coercionError,
  ...node.value.validationErrors || [],
]));

const isCollapsed = ref(false);

const rootComputedClasses = computed(() => ({
  '--has-children': hasChildren.value,
  '--collapsed': isCollapsed.value,
}));

const computedClasses = computed(() => ({
  '--override-active': isOverrideActive.value,
  '--invalid': !node.value.isValid,
  '--required-error': node.value.validationErrors?.find((e) => e.type === 'EmptyRequiredValueError'),
  '--validation-error': !!node.value.validationErrors?.length,
  '--coercion-error': !!node.value.coercionError,
  '--resolution-error': !!node.value.resolutionError,
  '--schema-error': !!node.value.schemaErrors?.length,
}));

const hasChildren = computed(() => Object.values(node.value.children).length > 0);
const isOverrideActive = computed(() => !!node.value.overrides?.length);

const typeTooltip = computed(() => {
  return node.value.dataType.typeDescription;
});

const activeResolvers = computed(() => getActiveResolvers(node.value));

const resolverIcon = computed(() => {
  if (isOverrideActive.value) {
    return node.value.overrides?.[0]?.icon;
  }
  const resolverChain = activeResolvers.value;
  if (resolverChain.length) {
    return resolverChain[resolverChain.length - 1].icon || 'material-symbols-light:question-mark';
  }
  return 'bi:dash';
});
const resolverTooltip = computed(() => {
  // TODO: probably want to special case these?
  // if override from a file, probably need a link to it
  if (node.value.overrides?.[0]) {
    return [
      'Overridden by ',
      node.value.overrides[0].sourceType,
      node.value.overrides[0].sourceLabel ? `: ${node.value.overrides[0].sourceLabel}` : '',
    ].join('');
  }
  return node.value.resolver?.label;
});


function onClick() {
  if (hasChildren.value) {
    isCollapsed.value = !isCollapsed.value;
  }
}

</script>

<style scoped>
.config-node {

  --child-indent: 4px;
  position: relative;

  &:first-child {
    margin-top: 0;
  }


  &.--has-children {
    /* &:before {
      content: '';
      width: var(--child-indent);
      background: var(--brand-yellow);
      position: absolute;
      left: 0;
      top: 1px;
      bottom: 1px;
      z-index: 2;
    } */
  }
  &.--has-children.--collapsed {
  }

  &:hover:before {
    content: '';
    width: 2px;
    background: light-dark(var(--brand-purple), var(--brand-purple));
    position: absolute;
    left: 0px;
    top: 1px;
    bottom: 1px;
    z-index: 2;
  }
}

.config-node__node {
  display: grid;
  grid-template-columns: min-content 1fr min-content;
  gap: 12px;
  padding: 8px 10px;
  cursor: pointer;
  /* align-items: start; */

  min-height: 30px;
  margin-top: -1px;
  border: 1px solid light-dark(#AAA, black);

  position: relative;
  background-color: var(--bg-1);

  &:hover {
    background-color: var(--bg-2);
  }

  /** errors */
  &.--invalid {
    /* border-left: 2px solid var(--error-red-text); */
    .config-node__label-text {
      /* color: var(--error-red-text); */
    }

    &:before {
      content: '';
      width: 1px;
      background: var(--error-red-text);
      position: absolute;
      left: -1px;
      top: 0px;
      bottom: 0px;
      z-index: 2;
    }

  }
  &.--validation-error, &.--coercion-error {
    .config-node__type-icon {
      color: var(--error-red-text);
    }
  }
  &.--schema-error, &.--resolution-error {
    .config-node__resolver-icon {
      color: var(--error-red-text);
    }
  }
  &.--required-error {
    .config-node__required-icon {
      color: var(--error-red-text);
    }
  }


  &.--override-active {
    .config-node__resolver-icon {
      color: var(--brand-pink);
    }
  }
}



.config-node__left, .config-node__right {
  justify-self: center;
  position: relative;
  display: flex;
  gap: 8px;
}

.config-node__label {
  display: flex;
  gap: 4px;
  padding-top: 1px; /* slight adjustment for being all caps, and cap height not being quite right */
  align-content: flex-start;
  font-weight: bold;

  .config-node__label-text {
    flex-shrink: 1;
  }

  &:deep(> .d-icon) {
    height: 1.2cap;
    margin: -.1cap 0;
    flex-shrink: 0;
  }
}


.config-node__type-icon, .config-node__resolver-icon {
  /* this should look centered vertically when in the default state, but stick to the top when the node grows */
  height: 22px;
  margin-top: 4px;
}
.config-node__resolver-chain-icon {
  height: 10px;
  position: absolute;
  right: 20px;
  top: -5px;
}

.config-node__sensitive-icon {
  position: absolute;
  left: 2px;
  bottom: 2px;
  width: 12px;
}


.config-node__center {
  display: grid;
  grid-template-rows: min-content min-content;
  gap: 8px;
  padding-left: 2px;

  /* subtle left border... */
  /* &:after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    margin-left: -10px;
    width: 1px;
    background: rgba(0,0,0,.4);
  } */
}

.config-node__label {
  font-size: 14px;
  /* line-height: 1cap; */
  font-weight: bold;
  /* text-overflow: ellipsis;
  line-clamp: 1; */
}
.config-node__value, .config-node__raw-value {
  font-size: 12px;
  /* line-height: 1cap; */
  /* font-style: italic; */
  text-wrap: nowrap;
}
.config-node__raw-value {
  font-size: 10px;
  opacity: .7;
}

.config-node__errors {
  font-size: 12px;
  line-height: 1.25em;
  /* no cap height fix here since it may wrap */
  margin-top: -1px;
  margin-bottom: -3px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  > div {
    color: var(--error-red-text);
  }
}
.config-node__children {
  /* margin-top: -1px; */
  /* background: var(--brand-yellow); */
  padding-left: 8px;

  /* slide open! only works in latest chrome */
  height: calc-size(min-content);
  transition: .2s height;

  overflow: hidden;
  &:empty {
    display: none;
  }
}

.config-node__collapse-toggle {
  position: absolute;
  left: 0px;
  bottom: 0px;
  margin-left: 2px;
  margin-bottom: 1px;
  width: 10px;
  height: 10px;
  transform: rotate(90deg);
  transition: .1s all;
  cursor: pointer;
  /* background: inherit; */
}
.config-node.--collapsed {
  .config-node__collapse-toggle {
    transform: rotate(0deg);
  }
  .config-node__children {
    height: 0;
  }
}
.config-node__node:hover {
  .config-node__collapse-toggle {
    width: 18px;
    height: 18px;
  }
  /* .config-node__type-icon {
    opacity: 0;
  } */
}


</style>
