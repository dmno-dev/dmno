<template>
  <div class="dmno-logo">
    <div class="d" />
  </div>
</template>

<style scoped lang="less">
.dmno-d {
  color: currentColor;
  width: 100px;
  height: 100px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;

  > div {
    width: 40%;
    height: 40%;
    border-radius: 50%;
    background: currentColor;
    position: absolute;
    transition: transform 1s;
  }
  > .d {
    border-radius: 0% 50% 50% 0%;
    margin-right: -5%;
  }
}
</style>
