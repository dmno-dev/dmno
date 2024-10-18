<template lang="pug">
.theme-toggle(@click="toggleTheme" @click.right.prevent="$refs.menuRef?.open")
  .theme-toggle__inner
    .theme-toggle__dark
      Icon(name="dark-mode")
    .theme-toggle__light
      Icon(name="light-mode")

  DropdownMenu(ref="menuRef")
    DropdownMenuItem(
      icon="dark-mode"
      label="dark mode"
      :checked="userSelectedTheme === 'dark'"
      @select="applyTheme('dark')"
    )
    DropdownMenuItem(
      icon="light-mode"
      label="light mode"
      :checked="userSelectedTheme === 'light'"
      @select="applyTheme('light')"
    )
    DropdownMenuItem(
      icon="sparkle"
      label="auto"
      :checked="userSelectedTheme === 'auto'"
      @select="applyTheme('auto')"
    )
</template>

<script setup lang="ts">
import { onBeforeMount, ref } from 'vue';
import Icon from '../general/Icon.vue';
import DropdownMenu from '../general/Dropdown/DropdownMenu.vue';
import DropdownMenuItem from '../general/Dropdown/DropdownMenuItem.vue';

const userSelectedTheme = ref<'dark' | 'light' | 'auto'>('auto');
const appliedTheme = ref<'dark' | 'light'>('dark');

const LS_THEME_KEY = 'dmno-theme';

function toggleTheme() {
  applyTheme(appliedTheme.value === 'light' ? 'dark' : 'light');
}
function applyTheme(newTheme?: 'light' | 'dark' | 'auto') {
  if (newTheme) userSelectedTheme.value = newTheme;

  if (userSelectedTheme.value === 'auto') {
    appliedTheme.value = (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    localStorage.removeItem(LS_THEME_KEY);
  } else {
    appliedTheme.value = userSelectedTheme.value;
    localStorage.setItem(LS_THEME_KEY, userSelectedTheme.value);
  }
  document.documentElement.dataset.theme = appliedTheme.value;
}


onBeforeMount(() => {
  applyTheme(localStorage.getItem(LS_THEME_KEY) as 'light' | 'dark' || 'auto');
});

</script>


<style>
html[data-theme="light"] {
  color-scheme: light;
}
html[data-theme="dark"] {
  color-scheme: dark;
}

</style>

<style scoped>
.theme-toggle {
  --tile-drop-shadow: hsla(0, 0%, 100%, 30%);
  height: 36px;
  aspect-ratio: 2 / 1;
  position: relative;
  cursor: pointer;
  perspective: 1000px;
  > * {
    pointer-events: none;
  }

  &:deep(.d-icon) {
    height: 100%;
    color: currentColor;
  }

  --hover-offset: -2px;

  &:hover {
    .theme-toggle__inner {
      > div {
        margin-top: -2px;
        margin-left: var(--hover-offset);
        box-shadow: 2px 2px 0px var(--tile-drop-shadow);
      }
    }
  }
}

html[data-theme="light"] .theme-toggle {
  /* have to reverse because of 3d flip */
  --hover-offset: 2px;
}

.theme-toggle__inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.25s;
  transform-style: preserve-3d;

  display: grid;
  grid-template-columns: 1fr 1fr;

  html[data-theme="light"] & {
    transform: rotateY(180deg);
  }
}

.theme-toggle__dark, .theme-toggle__light {
  height: 100%;
  width: 100%;
  border-radius: 4px;
  position: absolute;
  padding: 10%;
  backface-visibility: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 4px;
    bottom: 4px;
    z-index: 2;
    left: 50%;
    width: 1px;
    background: currentColor;
    opacity: .3;
  }
}
.theme-toggle__dark {
  background: black;
  color: white;
}
.theme-toggle__light {
  background: white;
  border: 1px solid black;
  color: black;
  transform: rotateY(180deg);
}
</style>
