<script setup lang="ts">
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
</script>


<template>
  <OverlayScrollbarsComponent
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
