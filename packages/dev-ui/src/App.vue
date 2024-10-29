<!-- eslint-disable vue/no-multiple-template-root -->
<template lang="pug">
  HeaderBar
  //- routes can target main and details panel using #main #sidebar and #details
  RouterView
  //- .footer-bar hello this is a footer {{ rtStore.connectionStatus }}
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue';
import DmnoLogoForFavicon from '@dmno/ui-lib/brand-assets/domino-d-gradient-tile.svg?url';
import HeaderBar from './components/layout/HeaderBar.vue';
import GraphOutline from './components/sidebar/GraphOutline.vue';
import { useRealtimeStore } from './store/realtime.store';


// initializing the realtime store sets up the websocket connection
const rtStore = useRealtimeStore();

useHead({
  link: [
    {
      rel: 'icon',
      href: DmnoLogoForFavicon,
    },
  ],
  // set up title template and a default
  titleTemplate: 'DMNO Dev | %s',
  title: 'Home',
});

</script>

<style>
#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: grid;
  grid-template-rows: min-content 1fr min-content;
  grid-template-columns: max-content auto max-content;
  grid-template-areas:
    'header header header'
    'sidebar main details'
    'footer footer footer';
}

#main {
  grid-area: main;
  overflow: auto;
  border-left: 1px solid black;
  padding: 10px;
}
#sidebar {
  overflow: auto;
  position: relative;
}
#details {
  grid-area: details;
  background: red;
}


</style>

<style scoped>

header {
  line-height: 1.5;
}

.footer-bar {
  grid-area: footer;
  background: green;
  /* position: sticky;
  bottom: 0;
  background: black;
  color: white; */
}
</style>
