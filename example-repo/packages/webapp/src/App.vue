<template>
  <div>
    <h1>Vite + DMNO!</h1>
    <p>DMNO_PUBLIC_CONFIG.RANDOM_NUM: {{ randomNumFromEnv }}</p>
    <p>DMNO_PUBLIC_CONFIG.CACHED_RANDOM_NUM: {{ cachedRandomNumFromEnv }}</p>
  </div>
</template>

<script setup lang="ts">
// NOTE - using `import.meta.env.XXX` and `DMNO_PUBLIC_CONFIG.XXX` doesnt work within vue templates
// so we have to pull them into vars here first
const randomNumFromEnv = DMNO_PUBLIC_CONFIG.RANDOM_NUM;
const cachedRandomNumFromEnv = DMNO_PUBLIC_CONFIG.CACHED_RANDOM_NUM;

// TODO: this should throw a runtime error (not just ts + build error)
// console.log(DMNO_PUBLIC_CONFIG.ASDF);
</script>

<style scoped>

</style>
