<!-- eslint-disable vue/no-multiple-template-root -->
<template lang="pug">
div
  h1 OOPS!
  div Bad url...
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue';

useHead({
  title: '🙈 Oops!',
});

</script>
