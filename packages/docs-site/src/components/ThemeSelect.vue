
<template>
  <div class="theme-select" @click="toggleTheme">
    <div class="theme-select__inner">
      <div class="theme-select__dark">
        <div v-html="MoonIcon" />
      </div>
      <div class="theme-select__light">
        <div v-html="SunIcon" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-ignore
import SunIcon from "~icons/material-symbols/light-mode?raw";
// @ts-ignore
import MoonIcon from "~icons/material-symbols/dark-mode?raw";

function toggleTheme() {
  const currentTheme = document.documentElement.dataset.theme;
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('starlight-theme', newTheme); 
  document.documentElement.dataset.theme = newTheme;
}
</script>

<style lang="less">
.theme-select {
  width: 64px;
  height: 32px;
  position: relative;
  cursor: pointer;
  perspective: 1000px;

  svg {
    height: 16px;
    width: 16px;
    color: currentColor;
    position: absolute;
  }

  --hover-offset: -2px;

  html[data-theme="light"] & {
    --hover-offset: 2px; // have to reverse because of 3d flip
  }

  &:hover {
    .theme-select__inner {
      > div {
        margin-top: -2px;
        margin-left: var(--hover-offset);
        box-shadow: 2px 2px 0px var(--tile-drop-shadow);
      }
    }
  }
  // &:active {
  //   .theme-select__inner {
  //     > div {
  //       margin-top: 0px;
  //       margin-left: 0;
  //       box-shadow: none;
  //     }
  //   }
  // }
}

.theme-select__inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.25s;
  transform-style: preserve-3d;

  >div {
    // transition: all .1s;
  }

  html[data-theme="light"] & {
    transform: rotateY(180deg);
  }
}

.theme-select__dark, .theme-select__light {
  height: 100%;
  width: 100%;
  border-radius: 4px;
  position: absolute;
  padding: 8px;

  backface-visibility: hidden;
  > div {
    &:before {
      content: '';
      position: absolute;
      top: 4px;
      bottom: 4px;
      width: 1px;
      background: currentColor;
      opacity: .3;
    }
  }
}
.theme-select__dark {
  background: black;
  color: white;
}
.theme-select__light {
  background: white;
  border: 1px solid black;
  color: black;
  transform: rotateY(180deg);
}
</style>
