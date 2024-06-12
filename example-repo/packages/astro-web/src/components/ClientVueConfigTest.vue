<template>
  <ul>
    <p>{{ DMNO_PUBLIC_CONFIG.FOO }}</p>
    <li v-for="val, key in configs">
      {{key}} = {{ val }}
    </li>
  </ul>
</template>

<script lang="ts" setup>
  const configs = {
    // 'DMNO_CONFIG.PUBLIC_STATIC': DMNO_CONFIG.PUBLIC_STATIC,
    // 'DMNO_CONFIG.PUBLIC_DYNAMIC': DMNO_CONFIG.PUBLIC_DYNAMIC,
    'DMNO_PUBLIC_CONFIG.PUBLIC_STATIC': DMNO_PUBLIC_CONFIG.PUBLIC_STATIC,
    'DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC': DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC,

    // throws because process undefined
    // 'process.env.FOO': process.env.FOO,

    // renders on server, then disappears on hydration becuase not prefixed with PUBLIC_
    // and shows hydration error
    // 'import.meta.env.FOO': import.meta.env.FOO,

    // works!
    'import.meta.env.PUBLIC_FOO': import.meta.env.PUBLIC_FOO,
  
    // throws hydration error about trying to access DMNO_CONFIG on the client
    // 'DMNO_CONFIG.PUBLIC_FOO': DMNO_CONFIG.PUBLIC_FOO,

    // throws leaked secret error if server rendered and hydration error about access DMNO_CONFIG on the client
    // 'DMNO_CONFIG.SECRET_FOO': DMNO_CONFIG.SECRET_FOO,

    'DMNO_PUBLIC_CONFIG.FOO': DMNO_PUBLIC_CONFIG.FOO,
    
    // throws because secret is not public
    // 'DMNO_PUBLIC_CONFIG.SECRET_FOO': DMNO_PUBLIC_CONFIG.SECRET_FOO,
    
    // throws because item does not exist
    // 'DMNO_PUBLIC_CONFIG.SECRET_FOO': DMNO_PUBLIC_CONFIG.ASDF,
  }
</script>
