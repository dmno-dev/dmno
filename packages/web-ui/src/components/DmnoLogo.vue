<template>
  <div class="dmno-logo">
    <div class="d" />
    <div class="m" />
    <div class="n" />
    <div class="o" />
  </div>
</template>


<script setup lang="ts">
import { PropType } from 'vue';
// const props = defineProps({
//   prop1: String,
//   prop2: { type: String, default },
//   prop3: { type: String as PropType<'a' | 'b'> },
// })

// const props2 = defineProps<{
//   prop1: string,
//   prop2?: string,
// }>();


</script>


<style scoped lang="less">
.dmno-logo {
  color: currentColor;
  width: 100px;
  height: 100px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;

  > div {
    width: 30%;
    height: 30%;
    border-radius: 50%;
    background: currentColor;
    position: absolute;
    transition: transform 1s;
  }
  > .d {
    border-radius: 0% 50% 50% 0%;
    transform: translate(-25cqb, -25cqb);
  }
  > .m {
    border-radius: 0% 50% 0% 0%;
    transform: translate(25cqb, -25cqb);
  }
  > .n {
    border-radius: 50% 50% 0% 0%;
    transform: translate(-25cqb, 25cqb);
  }
  > .o {
    border-radius: 50%;
    transform: translate(25cqb, 25cqb);
  }

}
</style>
