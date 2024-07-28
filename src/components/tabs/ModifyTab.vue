<script setup lang="ts">
const mapbox = useMapbox()

const _smoothRadius = ref(mapbox.value.settings.smoothRadius)
const _sharpenRadius = ref(mapbox.value.settings.sharpenRadius)

const _smoothing = computed(() => mapbox.value.settings.smoothing)
const _smthThres = computed(() => mapbox.value.settings.smthThres)
const _smthFade = computed(() => mapbox.value.settings.smthFade)
const _sharpen = computed(() => mapbox.value.settings.sharpen)
const _shrpThres = computed(() => mapbox.value.settings.shrpThres)
const _shrpFade = computed(() => mapbox.value.settings.shrpFade)
const resolution = computed(() => mapbox.value.settings.resolution * (mapbox.value.settings.gridInfo === 'cs2' ? 4 : 1))
const radiusLimit = computed(() => Math.min((resolution.value - 1) / 2, 100))

watch(_sharpen, () => {
  if (mapbox.value.settings.displayEffectArea) {
    mapbox.value.map?.setPaintProperty(
      'sharpenLayer',
      'raster-opacity',
      getRasterOpacity(mapbox.value.settings.sharpen),
    )
  }
})

watch(_smoothing, () => {
  if (mapbox.value.settings.displayEffectArea) {
    mapbox.value.map?.setPaintProperty(
      'smoothLayer',
      'raster-opacity',
      getRasterOpacity(mapbox.value.settings.smoothing),
    )
  }
})

watch([_shrpThres, _shrpFade], () => {
  mapbox.value.map?.setPaintProperty(
    'sharpenLayer',
    'raster-color',
    getSharpenLayerColor(),
  )
})

watch([_smthThres, _smthFade], () => {
  mapbox.value.map?.setPaintProperty(
    'smoothLayer',
    'raster-color',
    getSmoothLayerColor(),
  )
})

watch(resolution, () => {
  _smoothRadius.value = Math.min(radiusLimit.value, _smoothRadius.value)
  _sharpenRadius.value = Math.min(radiusLimit.value, _sharpenRadius.value)
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

const onPreview = () => {

}
</script>

<template>
  <div id="modify-tab">
    <canvas ref="previewCanvasRef" class="preview-canvas"></canvas>
    <div class="preview-info">
      <div class="normalize">
        <label for="normalize-modify">Normalize View&#8202;:&nbsp;&nbsp;</label>
        <ToggleSwitch v-model="mapbox.settings.normalizeModify" :name="'normalize-modify'" />
      </div>
      <div class="resolution">Calc. Resolution&#8202;:&nbsp;{{ resolution }}&nbsp;px</div>
    </div>
    <div class="controls">
      <hr>
      <label for="smooth">Smoothing&#8202;:</label>
      <NumberInput id="smooth" v-model="mapbox.settings.smoothing" class="gap" :max="100" :min="0" :step="1" :unit="'%'" />
      <label for="smooth-radius">Radius&#8202;:</label>
      <NumberInput id="smooth-radius" v-model="_smoothRadius" :max="radiusLimit" :min="1" :step="1" :unit="'px'" />
      <label for="smooth-threshold">Threshold&#8202;:</label>
      <NumberInput id="smooth-threshold" v-model="mapbox.settings.smthThres" class="gap" :max="10000" :min="0" :step="10" :unit="'m'" />
      <label for="smooth-fade">Fade&#8202;:</label>
      <NumberInput id="smooth-fade" v-model="mapbox.settings.smthFade" :max="1000" :min="0" :step="10" :unit="'m'" />
      <hr>
      <label for="sharpen">Sharpen&#8202;:</label>
      <NumberInput id="sharpen" v-model="mapbox.settings.sharpen" class="gap" :max="200" :min="0" :step="1" :unit="'%'" />
      <label for="sharpen-radius">Radius&#8202;:</label>
      <NumberInput id="sharpen-radius" v-model="_sharpenRadius" :max="radiusLimit" :min="1" :step="1" :unit="'px'" />
      <label for="sharpen-threshold">Threshold&#8202;:</label>
      <NumberInput id="sharpen-threshold" v-model="mapbox.settings.shrpThres" class="gap" :max="10000" :min="0" :step="10" :unit="'m'" />
      <label for="sharpen-fade">Fade&#8202;:</label>
      <NumberInput id="sharpen-fade" v-model="mapbox.settings.shrpFade" :max="1000" :min="0" :step="10" :unit="'m'" />
      <label for="noise-value">Noise Value&#8202;:</label>
      <NumberInput id="noise-value" v-model="mapbox.settings.noise" class="gap" :max="100" :min="0" :step="1" :unit="'m'" />
      <label for="noise-detail">Noise Detail&#8202;:</label>
      <NumberInput id="noise-detail" v-model="mapbox.settings.noiseGrid" :max="1000" :min="1" :step="1" />
      <hr>
      <label class="reflect-label" for="reflect">Reflect the effect amount on the map&#8202;:</label>
      <ToggleSwitch v-model="mapbox.settings.applyEffectAmount" :name="'reflect'" @change="toggleDisplayEffect" />
    </div>
    <footer class="footer">
      <button class="preview-btn" @click="onPreview">Preview</button>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
#general-tab {
  width: 100%;
}

.preview-canvas {
  width: 100%;
  aspect-ratio: 1;
  background-color: #000;
  margin-bottom: .25rem;
}

.preview-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.normalize {
  display: flex;
}

.resolution {
  color: $textAlt;
}

.controls {
  display: grid;
  width: 100%;
  gap: .75rem 0;
  grid-template-columns: 6.25rem 7.25rem 6.25rem 6.25rem;
  line-height: 2;
  margin-bottom: 1.5rem;

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
  margin: .125rem 0;
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

.preview-btn {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  display: block;
  font-weight: 700;
  height: 2rem;
  line-height: 2;
  color: $textColor;
  padding: 0 1rem;
  border-radius: 1rem;
  background-color: rgba(255, 255, 255, .2);
  margin: 0 0 0 auto;
  cursor: pointer;
  @include shadow-2;

  &:hover,
  &:focus {
    color: aquamarine;
    background-color: rgba(0, 206, 209, .35);
    @include shadow-3;
  }
}
</style>
