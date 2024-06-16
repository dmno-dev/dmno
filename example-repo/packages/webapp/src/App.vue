<template>
  <div>
    <h1>Vite + DMNO!!</h1>

    <!-- <p>{{ DMNO_PUBLIC_CONFIG.PUBLIC_STATIC }}</p> -->

    <ul>
      <li
        v-for="_itemVal, itemKey in envVars"
        :key="itemKey"
      >
        {{ itemKey }} =
        <template v-if="envVars[itemKey] !== undefined">
          {{ envVars[itemKey] }}
        </template>
        <template v-else>
          <i>empty</i>
        </template>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">

const envVars = {
  'DMNO_PUBLIC_CONFIG.RANDOM_NUM': DMNO_PUBLIC_CONFIG.RANDOM_NUM,
  'DMNO_PUBLIC_CONFIG.CACHED_RANDOM_NUM': DMNO_PUBLIC_CONFIG.CACHED_RANDOM_NUM,
  'DMNO_PUBLIC_CONFIG.PUBLIC_STATIC': DMNO_PUBLIC_CONFIG.PUBLIC_STATIC,
  'DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC': DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC,

  // error because DMNO_CONFIG doesnt exist
  // 'DMNO_CONFIG.SECRET_STATIC': DMNO_CONFIG.SECRET_STATIC,
  // error because key doesnt exist in DMNO_PUBLIC_CONFIG doesnt exist
  // 'DMNO_PUBLIC_CONFIG.SECRET_STATIC': DMNO_PUBLIC_CONFIG.SECRET_STATIC,

};

// TODO: this should throw a runtime error (not just ts + build error)
// console.log(DMNO_PUBLIC_CONFIG.ASDF);
</script>

<style scoped>

</style>
