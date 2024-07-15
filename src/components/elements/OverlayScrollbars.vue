<script setup lang="ts">
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
</script>


<template>
  <OverlayScrollbarsComponent
    class=""
    :options="{
      scrollbars: {
        theme: 'os-theme-dark',
        autoHide: 'scroll',
        visibility: 'auto',
        autoHideDelay: 1000,
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
