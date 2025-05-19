<script setup lang="ts">
const mapbox = useMapbox()

watch(() => mapbox.value.settings.sharpen, (newValue) => {
  if (mapbox.value.settings.displayEffectArea) {
    mapbox.value.map?.setPaintProperty(
      'sharpenLayer',
      'raster-opacity',
      getRasterOpacity(newValue),
    )
  }
})

watch(() => mapbox.value.settings.smoothing, (newValue) => {
  if (mapbox.value.settings.displayEffectArea) {
    mapbox.value.map?.setPaintProperty(
      'smoothLayer',
      'raster-opacity',
      getRasterOpacity(newValue),
    )
  }
})

watch([() => mapbox.value.settings.shrpThres, () => mapbox.value.settings.shrpFade], () => {
  mapbox.value.map?.setPaintProperty(
    'sharpenLayer',
    'raster-color',
    getSharpenLayerColor(),
  )
})

watch([() => mapbox.value.settings.smthThres, () => mapbox.value.settings.smthFade], () => {
  mapbox.value.map?.setPaintProperty(
    'smoothLayer',
    'raster-color',
    getSmoothLayerColor(),
  )
})

const toggleDisplayEffect = () => {
  mapbox.value.map?.setPaintProperty(
    'sharpenLayer',
    'raster-opacity',
    getRasterOpacity(mapbox.value.settings.sharpen),
  )
  mapbox.value.map?.setPaintProperty(
    'smoothLayer',
    'raster-opacity',
    getRasterOpacity(mapbox.value.settings.smoothing),
  )
}
</script>

<template>
  <div class="controls">
    <label for="smooth">Smoothing&#8202;:</label>
    <NumberInput id="smooth" v-model="mapbox.settings.smoothing" class="gap" :max="100" :min="0" :step="1" unit="%" />
    <label for="smooth-radius">Radius&#8202;:</label>
    <NumberInput id="smooth-radius" v-model="mapbox.settings.smoothRadius" :max="100" :min="1" :step="1" unit="px" />
    <label for="smooth-threshold">Threshold&#8202;:</label>
    <NumberInput id="smooth-threshold" v-model="mapbox.settings.smthThres" class="gap" :max="10000" :min="-10000" :step="10" unit="m" />
    <label for="smooth-fade">Fade&#8202;:</label>
    <NumberInput id="smooth-fade" v-model="mapbox.settings.smthFade" :max="1000" :min="0" :step="10" unit="m" />
    <hr>
    <label for="sharpen">Sharpen&#8202;:</label>
    <NumberInput id="sharpen" v-model="mapbox.settings.sharpen" class="gap" :max="200" :min="0" :step="1" unit="%" />
    <label for="sharpen-radius">Radius&#8202;:</label>
    <NumberInput id="sharpen-radius" v-model="mapbox.settings.sharpenRadius" :max="100" :min="1" :step="1" unit="px" />
    <label for="sharpen-threshold">Threshold&#8202;:</label>
    <NumberInput id="sharpen-threshold" v-model="mapbox.settings.shrpThres" class="gap" :max="10000" :min="-10000" :step="10" unit="m" />
    <label for="sharpen-fade">Fade&#8202;:</label>
    <NumberInput id="sharpen-fade" v-model="mapbox.settings.shrpFade" :max="1000" :min="0" :step="10" unit="m" />
    <label for="noise-value">Noise&#8202;:</label>
    <NumberInput id="noise-value" v-model="mapbox.settings.noise" class="gap" :max="1000" :min="0" :step="1" unit="m" />
    <label for="noise-threshold">Threshold&#8202;:</label>
    <NumberInput id="noise-threshold" v-model="mapbox.settings.noiseThres" :max="1000" :min="0" :step="1" unit="m" />
    <hr>
    <label class="reflect-label" for="reflect">Reflect the effect amount on the map&#8202;:</label>
    <ToggleSwitch v-model="mapbox.settings.applyEffectAmount" :name="'reflect'" @change="toggleDisplayEffect" />
  </div>
</template>

<style lang="scss" scoped>
.controls {
  display: grid;
  width: 100%;
  gap: .75rem 0;
  grid-template-columns: 6.25rem 7.25rem 6.25rem 6.25rem;
  line-height: 1.875;
  margin: .75rem 0 1rem;

  @media screen and (max-width: 524px) {
    margin-bottom: 1.5rem;
    grid-template-columns: 1fr 7rem;
  }

  :deep(.toggle-switch) {
    margin: auto 0 auto auto;
  }
}

@media screen and (min-width: 525px) {
  :deep(.gap) {
    width: 6.25rem !important;
  }
}

hr {
  background-color: $borderColor;
  height: 2px;
  border: none;
  grid-column: 1 / 5;

  @media screen and (max-width: 524px) {
    grid-column: 1 / 3;
  }
}

.reflect-label {
  line-height: 1.25;

  @media screen and (min-width: 525px) {
    line-height: 2;
    grid-column: 1 / 4;
  }
}
</style>
