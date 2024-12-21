<template lang="pug">
#header-bar
  .logo-wrap
    DmnoLogo
    .logo-text DMNO
  div
  .header-bar__right-menu
    a(v-tooltip="'help'" href="https://dmno.dev/docs/" target="_blank")
      Icon(name="docs" size="l")
    ThemeToggle
  //- DmnoLogoSvg.dmno-logo

</template>

<script lang="ts" setup>
import { DmnoLogo } from '@dmno/ui-lib';
import Icon from '../general/Icon.vue';
import ThemeToggle from './ThemeToggle.vue';

</script>


<style scoped>
#header-bar {
  grid-area: header;
  color: white;
  padding: 6px 8px;
  background: #2a2a2a;
  display: grid;
  grid-template-columns: max-content 1fr max-content;
  align-items: center;
  border-bottom: 1px solid #000;
}

.logo-wrap {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-text {
  font-family: var(--logo-font);
  font-size: 28px;
}

.header-bar__right-menu {
  display: flex;
  gap: 24px;
  align-items: center;
  > a {
    color: inherit;
    transition: .2s all;
    &:hover {
      color: var(--brand-cyan);
      transform: scale(1.1);

    }
  }
}

</style>
