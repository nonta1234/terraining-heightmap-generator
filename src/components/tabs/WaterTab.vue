<script setup lang="ts">
const mapbox = useMapbox()
</script>


<template>
  <div id="water-tab">
    <GridCanvas />
    <ResetSlope class="reset-slope" />
    <div class="controls">
      <label for="water-depth">Water Depth&#8202;:</label><NumberInput id="water-depth" v-model="mapbox.settings.depth" :max="200" :min="0" :step="1" /><span class="unit left">m</span>
      <label for="zone">Littoral Zone&#8202;:</label><NumberInput id="zone" v-model="mapbox.settings.littoral" :max="500" :min="0" :step="1" /><span class="unit">m</span>
      <label for="stream-depth">Stream Depth&#8202;:</label><NumberInput id="stream-depth" v-model="mapbox.settings.streamDepth" :max="100" :min="0" :step="1" /><span class="unit left">m</span>
    </div>
  </div>
</template>


<style lang="scss" scoped>
#water-tab {
  width: 100%;
}
.reset-slope {
  padding-top: .5rem;
}
.controls {
  display: grid;
  width: 100%;
  gap: .75rem 0;
  padding-top: 1rem;
  grid-template-columns: 1fr 4.5em auto 1fr 4.5rem auto;
  line-height: 2;
  @media screen and (max-width: 480px) {
    grid-template-columns: 1fr 6rem 1.375rem;
  }
}
.unit {
  display: block;
  line-height: 2;
  padding-left: .25rem;
}
.left {
  margin-right: 1.5rem;
  @media screen and (max-width: 480px) {
    margin-right: 0;
  }
}
</style>
