<template>
  <div class="logo-with-loader">
    <DmnoLogo />
    <div class="logo-with-loader__line" />
    <DominoLoader />
  </div>

</template>


<script setup lang="ts">
import DmnoLogo from './components/DmnoLogo.vue';
import DominoLoader from './components/DominoLoader.vue';

import { useHead } from '@unhead/vue'

useHead({
  title: 'DMNO - configure, run, and deploy your entire stack'
})

</script>


<style>
:root {
  --shadow-color: 0deg 0% 0%;
  --shadow-elevation-low:
    -0.5px 0.9px 1.1px hsl(var(--shadow-color) / 0.1),
    -0.7px 1.5px 1.8px -1.3px hsl(var(--shadow-color) / 0.1),
    -1.8px 3.6px 4.4px -2.7px hsl(var(--shadow-color) / 0.1);
  --shadow-elevation-medium:
    -0.5px 0.9px 1.1px hsl(var(--shadow-color) / 0.11),
    -1.4px 2.9px 3.6px -0.9px hsl(var(--shadow-color) / 0.11),
    -3.6px 7.2px 8.9px -1.8px hsl(var(--shadow-color) / 0.1),
    -8.9px 17.8px 21.9px -2.7px hsl(var(--shadow-color) / 0.1);
  --shadow-elevation-high:
    -0.5px 0.9px 1.1px hsl(var(--shadow-color) / 0.12),
    -2.8px 5.5px 6.8px -0.4px hsl(var(--shadow-color) / 0.11),
    -5.5px 10.8px 13.4px -0.9px hsl(var(--shadow-color) / 0.11),
    -9.7px 19.3px 23.8px -1.3px hsl(var(--shadow-color) / 0.11),
    -16.7px 33.2px 41px -1.8px hsl(var(--shadow-color) / 0.11),
    -27.7px 55px 67.9px -2.2px hsl(var(--shadow-color) / 0.11),
    -43.8px 87.1px 107.5px -2.7px hsl(var(--shadow-color) / 0.11);
}

.logo-with-loader {
  background: black;
  color: white;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  gap: 20px;
  position: relative;
  transform: rotate(-10deg);
  transition: all .5s;

  box-shadow: var(--shadow-elevation-high);

  &:hover {
    transform: rotate(0deg);
  }
  .logo-with-loader__line {
    position: absolute;
    background: currentColor;
    opacity: .2;
    width: 1px;
    top: 10px;
    bottom: 10px;
    left: 50%;
  }

  &:after {
    content: '';
    position: absolute;
    width: 100%;
  }
}
</style>
