<template lang="pug">
  .integrations-hero
    //- div
    //-   transition(name="swap")
    //-     IntegrationTile(
    //-       :key="activeIndexes.plugin"
    //-       :info="TILES.plugin[activeIndexes.plugin]"
    //-     )
    //- div
    //-   transition(name="swap")
    //-     IntegrationTile(
    //-       :key="activeIndexes.integration"
    //-       :info="TILES.integration[activeIndexes.integration]"
    //-       dots-position="top"
    //-     )
    //- div
    //-   transition(name="swap")
    //-     IntegrationTile(
    //-       :key="activeIndexes.platform"
    //-       :info="TILES.platform[activeIndexes.platform]"
    //-       dots-position="left"
    //-     )

    .integrations-hero__tiles
      template(v-for="integrationType, rowIndex in Object.keys(TILES)" :key="integrationType")
        div(:ref="(el) => rowEls[integrationType] = el")
          IntegrationTile(
            v-for="i in activeIndexesList[integrationType]"
            :key="`${integrationType}-${i}`"
            :info="TILES[integrationType][i]"
            :dot-number="i+1"
            :dots-position="rowIndex % 2 === 1 ? 'left' : 'right'"
            :class="i === activeIndexes[integrationType] ? '--active' : ''"
          )
    .integrations-hero__text
      div
        span Use secrets from <b>{{ TILES.plugin[activeIndexes.plugin].label }}</b>
      div
        span with <b>{{ TILES.integration[activeIndexes.integration].label }}</b>
      div
        span deployed to <b>{{ TILES.platform[activeIndexes.platform].label }}</b>

</template>

<script setup lang="ts">
import {
  ref, onMounted, onUnmounted, computed,
  reactive,
  useTemplateRef,
} from 'vue';
import { Icon } from '@iconify/vue';
// import ConnectionLine from './ConnectionLine.vue';
import DMNOLogo from '@dmno/ui-lib/brand-assets/domino-d-gradient-tile.svg';
import IntegrationTile from './IntegrationTile.vue';


const TILES = Object.freeze({
  plugin: [
    {
      icon: 'simple-icons:1password', label: '1Password', docsHref: '/docs/plugins/1password/', color: '19275e',
    },
    {
      icon: 'simple-icons:bitwarden', label: 'Bitwarden', docsHref: '/docs/plugins/bitwarden/', color: '165bdb',
    },
    { icon: 'mdi:lock', label: 'Encrypted Vault', docsHref: '/docs/plugins/encrypted-vault/' },
    { icon: 'mdi:infinity', label: 'Infisical', docsHref: '/docs/plugins/infisical/' },
    { icon: 'mdi:server-outline', label: 'your self-hosted secrets manager', docsHref: '/docs/plugins/overview/' },
    {
      icon: 'file-icons:dotenv', label: 'dotenv files', docsHref: '/docs/plugins/overview/', color: '555555',
    },
  ],
  integration: [
    { icon: 'devicon:remix', label: 'Remix', docsHref: '/docs/integrations/remix/' },
    { icon: 'devicon:nextjs', label: 'Next.js', docsHref: '/docs/integrations/nextjs/' },
    { icon: 'devicon:astro', label: 'Astro', docsHref: '/docs/integrations/astro/' },
    { icon: 'logos:vitejs', label: 'Vite', docsHref: '/docs/integrations/vite/' },
    { icon: 'devicon:nodejs', label: 'Node.js', docsHref: '/docs/integrations/node/' },
  ],
  platform: [
    { icon: 'devicon:netlify', label: 'Netlify', docsHref: '/docs/platforms/netlify/' },
    { icon: 'devicon:vercel', label: 'Vercel', docsHref: '/docs/platforms/vercel/' },
    { icon: 'devicon:cloudflare', label: 'Cloudflare', docsHref: '/docs/platforms/cloudflare/' },
    { icon: 'devicon:docker', label: 'Docker', docsHref: '/docs/platforms/' },
    { icon: 'mdi:server-outline', label: 'Self-hosted infra', docsHref: '/docs/platforms/overview/' },
  ],
});

const activeIndexes = reactive({
  plugin: Math.floor(Math.random() * TILES.plugin.length),
  integration: Math.floor(Math.random() * TILES.integration.length),
  platform: Math.floor(Math.random() * TILES.platform.length),
});

function getIndexes(i, arrayLength) {
  return [
    (arrayLength + i - 2) % arrayLength,
    (arrayLength + i - 1) % arrayLength,
    i,
    (i + 1) % arrayLength,
    (i + 2) % arrayLength,
  ];
}
const activeIndexesList = computed(() => ({
  plugin: getIndexes(activeIndexes.plugin, TILES.plugin.length),
  platform: getIndexes(activeIndexes.platform, TILES.platform.length),
  integration: getIndexes(activeIndexes.integration, TILES.integration.length),
}));

const rowEls = ref({});

function initRowAnimationRestart(type: keyof typeof TILES) {
  const el = rowEls.value[type];
  el.addEventListener('animationend', () => {
    const delta = type === 'integration' ? -1 : 1;
    // using % on negative numbers doesn't work, so we add the full length again to stay positive
    activeIndexes[type] = (TILES[type].length + activeIndexes[type] + delta) % TILES[type].length;
    // restart the animation - no simple way...
    el.style.animation = 'none';
    // eslint-disable-next-line no-void
    void el.offsetWidth; // trigger reflow
    el.style.animation = null;
  });
}

onMounted(() => {
  let type: keyof typeof TILES;
  for (type in TILES) initRowAnimationRestart(type);
});


</script>

<style scoped>
@keyframes slide-left {
  from { transform: translateX(var(--tile-width)); }
  to { transform: translateX(calc(-1 * var(--tile-spacing))); }
}
@keyframes slide-right {
  from { transform: translateX(calc(-1 * var(--tile-width))); }
  to { transform: translateX(var(--tile-spacing)); }
}

.integrations-hero {

  --tile-shift-duration: 4s;
  --tile-width: 100px;
  --tile-height: calc(var(--tile-width) / 2);
  --tile-spacing: calc(var(--tile-width) / 10);
  --tile-width-w-spacing: calc(var(--tile-width) + var(--tile-spacing));

  display: grid;
  /* margin: 0 10%; */

  grid-template-columns: calc(3 * var(--tile-width)) 1fr;
  gap: 0px;
  /* justify-content: center; */
  align-items: center;

  .integrations-hero__text {
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    display: flex;
    gap: var(--tile-spacing);
    flex-direction: column;

    > div {
      /* min-height: var(--tile-height); */
      display: grid;
      align-items: center;
    }
    > div:nth-child(1) b {
      color: var(--brand-pink);
    }
    > div:nth-child(2) b {
      color: var(--brand-green);
    }
    > div:nth-child(3) b {
      color: var(--brand-cyan);
    }
  }

  .integrations-hero__tiles {

    /* overlay to see active area */
    &::before {
      content: '';
      top: 0;
      bottom: 0;
      width: var(--tile-width);
      left: var(--tile-width-w-spacing);
      position: absolute;
      background: rgba(255,0,0,.4);
      z-index: 2;
      display: none;
    }
    position: relative;
    display: flex;
    gap: var(--tile-spacing);
    flex-direction: column;
    padding-top: var(--tile-spacing);
    padding-bottom: var(--tile-spacing);
    height: calc(3 * (var(--tile-height) + var(--tile-spacing)) + var(--tile-spacing) );
    mask-image: linear-gradient(to right,
      transparent 12%,
      red 30%,
      red 70%,
      transparent 88%
    );

    > div {
      height: var(--tile-height);
      width: calc(5 * (var(--tile-width-w-spacing)));
      margin-left: calc(-1 * (var(--tile-width-w-spacing)));
      position: relative;
      display: flex;
      gap: var(--tile-spacing);

      &:hover {
        animation-play-state: paused;
      }

      animation: slide-left var(--tile-shift-duration) linear;
      &:nth-child(2) {
        animation-name: slide-right;
      }
    }
  }

}
</style>
