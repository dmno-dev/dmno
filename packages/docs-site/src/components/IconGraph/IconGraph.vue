<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Icon } from '@iconify/vue';
import ConnectionLine from './ConnectionLine.vue';
import DMNOLogo from '@dmno/ui-lib/brand-assets/domino-d-gradient-tile.svg';

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const secretIcons = ref([
  { icon: 'mdi:1password', label: '1Password', docsHref: '/docs/plugins/1password/' },
  { icon: 'simple-icons:bitwarden', label: 'Bitwarden', docsHref: '/docs/plugins/bitwarden/' },
  { icon: 'mdi:lock', label: 'Encrypted Vault', docsHref: '/docs/plugins/encrypted-vault/' },
  { icon: 'mdi:infinity', label: 'Infisical', docsHref: '/docs/plugins/infisical/' },
  { icon: 'mdi:server-outline', label: 'Self-hosted', docsHref: '/docs/plugins/overview/' },
]);

const integrationIcons = ref([
  { icon: 'devicon:remix', label: 'Remix', docsHref: '/docs/integrations/remix/' },
  { icon: 'devicon:nextjs', label: 'Next.js', docsHref: '/docs/integrations/nextjs/' },
  { icon: 'devicon:astro', label: 'Astro', docsHref: '/docs/integrations/astro/' },
  { icon: 'logos:vitejs', label: 'Vite', docsHref: '/docs/integrations/vite/' },
  { icon: 'devicon:nodejs', label: 'Node.js', docsHref: '/docs/integrations/node/' }
]);

const platformIcons = ref([
  { icon: 'devicon:netlify', label: 'Netlify', docsHref: '/docs/platforms/netlify/' },
  { icon: 'devicon:vercel', label: 'Vercel', docsHref: '/docs/platforms/vercel/' },
  { icon: 'devicon:cloudflare', label: 'Cloudflare', docsHref: '/docs/platforms/cloudflare/' },
  { icon: 'devicon:docker', label: 'Docker - Coming Soon', docsHref: '/docs/platforms/' },
  { icon: 'mdi:server-outline', label: 'Self-hosted', docsHref: '/docs/platforms/overview/' },
]);

// Selected icon states
const selectedLeftIndex = ref(0);
const selectedMiddleIndex = ref(0);
const selectedRightIndex = ref(0);

const LEFT_INTERVAL = 2000;
const MIDDLE_INTERVAL = 2500;
const RIGHT_INTERVAL = 2500;

// Cycle through icons every 2 seconds
onMounted(() => {
  shuffleArray(secretIcons.value);
  shuffleArray(integrationIcons.value);
  shuffleArray(platformIcons.value);

  setInterval(() => {
    selectedLeftIndex.value = (selectedLeftIndex.value + 1) % secretIcons.value.length;
  }, LEFT_INTERVAL);

  setInterval(() => {
    selectedMiddleIndex.value = (selectedMiddleIndex.value + 1) % integrationIcons.value.length;
  }, MIDDLE_INTERVAL);

  setInterval(() => {
    selectedRightIndex.value = (selectedRightIndex.value + 1) % platformIcons.value.length;
  }, RIGHT_INTERVAL);
});

// Adjusted coordinates for better connections
const iconSize = 64 // 16 * 4 (w-16)
const centerIconSize = 80 // 20 * 4 (w-20)
const spacing = 100

// Column spacing, calculated based on the viewport width
const colSpacing = ref(window.innerWidth / 4 || 260); // Use SVG viewBox width divided by 4 columns

const leftX = computed(() => 0)
const centerX = computed(() => colSpacing.value)
const middleX = computed(() => colSpacing.value * 2)
const rightX = computed(() => colSpacing.value * 3)

onMounted(() => {
  const updateSpacing = () => {
    colSpacing.value = window.innerWidth / 4 || 260;
  }
  
  window.addEventListener('resize', updateSpacing)
  
  onUnmounted(() => {
    window.removeEventListener('resize', updateSpacing)
  })
})

// Calculate vertical positions
const getVerticalPosition = (index: number, total: number) => {
  const totalHeight = (total - 1) * spacing
  const startY = (600 - totalHeight) / 2
  return startY + (index * spacing)
}

// Center Y position - align with middle of all icons
const centerY = 300 - centerIconSize / 2

// Calculate connection points for the right group
const getRightConnectionY = (rightIndex: number, middleTotal: number) => {
  const middleSpacing = (middleTotal - 1) * spacing
  const middleStartY = (600 - middleSpacing) / 2
  const segmentSize = middleSpacing / (platformIcons.value.length - 1)
  return middleStartY + (rightIndex * segmentSize)
}

const navigateTo = (href: string) => {
  window.location.href = href;
}
</script>

<template>
  <div class="container">
    <div class="graph-container">
      <svg class="svg-container" viewBox="0 0 1000 600">
        <!-- Left to Center connections -->
        <template v-for="(_, index) in secretIcons" :key="`left-${index}`">
          <ConnectionLine
            :x1="leftX + iconSize"
            :y1="getVerticalPosition(index, secretIcons.length) + iconSize/2"
            :x2="centerX"
            :y2="centerY + centerIconSize/2"
            :active="index === selectedLeftIndex"
          />
        </template>

        <!-- Center to Middle connections -->
        <template v-for="(_, index) in integrationIcons" :key="`middle-${index}`">
          <ConnectionLine
            :x1="centerX + centerIconSize"
            :y1="centerY + centerIconSize/2"
            :x2="middleX"
            :y2="getVerticalPosition(index, integrationIcons.length) + iconSize/2"
            :active="index === selectedMiddleIndex"
          />
        </template>

        <!-- Middle to Right connections -->
        <template v-for="(_, index) in platformIcons" :key="`right-${index}`">
          <ConnectionLine
            :x1="middleX + iconSize"
            :y1="getRightConnectionY(index, integrationIcons.length) + iconSize/2"
            :x2="rightX"
            :y2="getVerticalPosition(index, platformIcons.length) + iconSize/2"
            :active="index === selectedRightIndex"
          />
        </template>
      </svg>

      <!-- Left Group -->
      <div class="column-container left" :style="{ left: leftX + 'px' }">
        <h2>Secrets</h2>
        <div
          v-for="(icon, index) in secretIcons"
          :key="index"
          :class="[
            'icon-base icon-left',
            index === selectedLeftIndex ? 'icon-selected' : ''
          ]"
          :style="{ top: getVerticalPosition(index, secretIcons.length) + 'px' }"
          :title="icon.label"
          @click="navigateTo(icon.docsHref)"
        >
          <Icon :icon="icon.icon" class="icon" :ssr="true" />
        </div>
      </div>

      <!-- Center Node -->
      <div
        class="center-icon"
        :style="{ 
          left: centerX + 'px',
          top: centerY + 'px'
        }"
      >
        <img :src="DMNOLogo.src" class="icon" />
      </div>

      <!-- Middle Group -->
      <div class="column-container middle" :style="{ left: middleX + 'px' }">
        <h2>Integrations</h2>
        <div
          v-for="(icon, index) in integrationIcons"
          :key="index"
          :class="[
            'icon-base icon-middle',
            index === selectedMiddleIndex ? 'icon-selected' : ''
          ]"
          :style="{ top: getVerticalPosition(index, integrationIcons.length) + 'px' }"
          :title="icon.label"
          @click="navigateTo(icon.docsHref)"
        >
          <Icon :icon="icon.icon" class="icon" :ssr="true" />
        </div>
      </div>

      <!-- Right Group -->
      <div class="column-container right" :style="{ left: rightX + 'px' }">
        <h2>Platforms</h2>
        <div
          v-for="(icon, index) in platformIcons"
          :key="index"
          :class="[
            'icon-base icon-right',
            index === selectedRightIndex ? 'icon-selected' : ''
          ]"
          :style="{ top: getVerticalPosition(index, platformIcons.length) + 'px' }"
          :title="icon.label"
          @click="navigateTo(icon.docsHref)"
        >
          <Icon :icon="icon.icon" class="icon" :ssr="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.container {
  margin-left: 40px;
  width: 100%;
  display: flex;
  align-items: left;
  justify-content: left;
}

.graph-container {
  position: relative;
  width: 1000px;
  height: 600px;
}


.svg-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.icon-base {
  width: 4rem; /* w-16 */
  height: 4rem; /* h-16 */
  background-color: white;
  border-radius: 0.5rem; /* rounded-lg */
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); /* shadow-lg */
  padding: 0.75rem; /* p-3 */
  transition-property: all;
  transition-duration: 300ms;
  position: absolute;
  cursor: pointer;
}

.icon-base:hover {
  transform: scale(1.1);
}

.icon-selected {
  transform: scale(1.1);
  border-width: 2px;
}

/* todo user brand colors */

.icon-left {
  border-color: rgb(156 163 175); 
}

.icon-left.icon-selected {
  border: 2px solid rgb(41, 232, 232);
}

.icon-middle.icon-selected {
  border: 2px solid rgb(116, 240, 161);
}

.icon-right.icon-selected {
  border: 2px solid rgb(243, 125, 227); 
}

.center-icon {
  position: absolute;
  width: 5rem; /* w-20 */
  height: 5rem; /* h-20 */
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  padding: 1rem; /* p-4 */
  transition-property: transform;
}

.center-icon:hover {
  transform: scale(1.1);
}

.icon {
  width: 100%;
  height: 100%;
  color: rgb(156 163 175); /* text-gray-400 */
}

.center-icon .icon {
  color: rgb(147 51 234); /* text-purple-600 */
}

.column-container {
  position: absolute;
  display: flex;
  flex-direction: column;
  /* gap: 1rem; */
}

.column-container > h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: rgb(221, 226, 233); /* text-gray-600 */
  text-align: left;
}

</style>
