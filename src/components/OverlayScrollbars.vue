<script setup lang="ts">
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
</script>


<template>
  <OverlayScrollbarsComponent
    class="overlay-scrollbars-elm"
    :options="{
      showNativeOverlaidScrollbars: true,
      scrollbars: {
        theme: 'os-theme-dark',
        autoHide: 'scroll',
        visibility: 'auto',
        autoHideDelay: 1300,
        dragScroll: true,
        clickScroll: false,
        pointers: ['mouse', 'touch', 'pen'],
      },
    }"
    defer
  >
    <slot />
  </OverlayScrollbarsComponent>
</template>

<style lang="scss" scoped>
  .overlay-scrollbars-elm {
    margin-bottom: -4px;
  }
</style>
