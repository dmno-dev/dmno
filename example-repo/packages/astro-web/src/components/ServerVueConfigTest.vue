<template>
  <ul>
    <li v-for="val, key in configs">
      {{key}} = {{ val }}
    </li>
  </ul>
</template>

<script lang="ts" setup>
  
  const configs = {
    'DMNO_PUBLIC_CONFIG.PUBLIC_STATIC': DMNO_PUBLIC_CONFIG.PUBLIC_STATIC,
    'DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC': DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC,

    // 'process.env.FOO': process.env.FOO,
    // 'import.meta.env.FOO': import.meta.env.FOO,
    // 'import.meta.env.PUBLIC_FOO': import.meta.env.PUBLIC_FOO,

    // LEAK ERROR!
    // 'DMNO_CONFIG.SECRET_FOO': DMNO_CONFIG.SECRET_FOO,

    // 'DMNO_PUBLIC_CONFIG.FOO': DMNO_PUBLIC_CONFIG.FOO,
    // not a public item error
    // 'DMNO_PUBLIC_CONFIG.SECRET_FOO': DMNO_PUBLIC_CONFIG.SECRET_FOO,
  }
  console.log(configs);
</script>
