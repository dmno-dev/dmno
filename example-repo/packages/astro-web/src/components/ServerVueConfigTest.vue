<template>
  <ul>
    <li v-for="val, key in configs">
      {{key}} = {{ val }}
    </li>
  </ul>
</template>

<script lang="ts" setup>
  
  const configs = {
    'process.env.FOO': process.env.FOO,
    'import.meta.env.FOO': import.meta.env.FOO,
    'import.meta.env.PUBLIC_FOO': import.meta.env.PUBLIC_FOO,
    'import.meta.dmnoEnv.PUBLIC_FOO': import.meta.dmnoEnv.PUBLIC_FOO,
    
    'process.dmnoEnv.FOO': process.dmnoEnv.FOO,
    // LEAK ERROR
    // 'process.dmnoEnv.SECRET_FOO': process.dmnoEnv.SECRET_FOO,

    'DMNO_CONFIG.FOO': DMNO_CONFIG.FOO,

    // LEAK ERROR!
    // 'DMNO_CONFIG.SECRET_FOO': DMNO_CONFIG.SECRET_FOO,

    'DMNO_PUBLIC_CONFIG.FOO': DMNO_PUBLIC_CONFIG.FOO,
    // not a public item error
    // 'DMNO_PUBLIC_CONFIG.SECRET_FOO': DMNO_PUBLIC_CONFIG.SECRET_FOO,
  }
  console.log(configs);
</script>
