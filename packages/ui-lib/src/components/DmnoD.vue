<template>
  <div class="dmno-d-logo">
    <div class="d" />
  </div>
</template>

<script setup lang="ts">


</script>




<style scoped>
.dmno-d-logo {
  --logo-color-1: #51FFC0;
  --logo-color-2: #FC67FF;

  color: currentColor;
  height: 100%;
  aspect-ratio: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: black;
  border-radius: 8%;

  > .d {
    position: absolute;
    width: 45%;
    height: 45%;
    border-radius: 5% 50% 50% 5%;
    margin-right: -5%;
    /* background: red; */
    background: linear-gradient(45deg, var(--logo-color-1), var(--logo-color-2));
  }
}
</style>
