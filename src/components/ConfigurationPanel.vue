<script setup lang="ts">
const mapbox = useMapbox()
const { isMobile } = useDevice()

const heightmapTypeRef = ref<HTMLSelectElement>()
const interpolationRef = ref<HTMLSelectElement>()
const watersideRef = ref<HTMLSelectElement>()

const onHeightmapTypeChange = () => {
  mapbox.value.settings.size = mapSpec[mapbox.value.settings.gridInfo].defaultSize || 2.000
  mapbox.value.settings.fixedRatio = true
  mapbox.value.settings.vertScale = 1
}

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

const close = () => {
  if (mapbox.value.settings.gridInfo === 'cs2' && mapbox.value.settings.accessToken === '') {
    alert(NEED_TOKEN)
  }
  useEvent('map:cpModal', false)
  setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
  saveSettings(mapbox.value.settings)
}
</script>


<template>
  <ModalWindow>
    <div id="config-panel">
      <h3>Configuration</h3>
      <CloseButton class="close" @click="close" />
      <OverlayScrollbars class="innerPanel">
        <div class="main">
          <div class="item">
            <label for="map-type">Heightmap Type&#8202;:</label>
            <div>
              <select id="map-type" ref="heightmapTypeRef" v-model="mapbox.settings.gridInfo" name="heightmapType" @change="onHeightmapTypeChange">
                <option value="cs1">CS1</option>
                <option value="cs2">CS2</option>
              </select>
            </div>
            <label for="interpolation">Interpolation&#8202;:</label>
            <div>
              <select id="interpolation" ref="interpolationRef" v-model="mapbox.settings.interpolation" name="interpolation">
                <option value="bilinear">Bilinear</option>
                <option value="bicubic">Bicubic</option>
              </select>
            </div>
            <label for="scale">Elevation Scale&#8202;:</label>
            <div>
              <NumberInput id="scale" v-model="mapbox.settings.elevationScale" :max="100000" :min="0" :step="0.001" />
            </div>
            <div class="unit">m</div>
            <label for="ws-detail">Waterside Detail&#8202;:</label>
            <div>
              <select id="ws-detail" ref="watersideRef" v-model="mapbox.settings.waterside" name="waterside">
                <option value="2">High</option>
                <option value="1">Mid</option>
                <option value="0">Low</option>
              </select>
            </div>
          </div>
          <div class="item">
            <label for="depth">Stream Depth&#8202;:</label>
            <div>
              <NumberInput id="depth" v-model="mapbox.settings.streamDepth" :max="100" :min="0" :step="1" />
            </div>
            <div class="unit">m</div>
            <label for="count">Smooth Count&#8202;:</label>
            <div>
              <NumberInput id="count" v-model="mapbox.settings.smoothCount" :max="20" :min="1" :step="1" />
            </div>
            <label class="prefix" for="noise-value">Noise Value&#8202;:</label>
            <div>
              <NumberInput id="noise-value" v-model="mapbox.settings.noise" :max="100" :min="0" :step="1" />
            </div>
            <div class="unit">m</div>
            <label for="noise-detail">Noise Detail&#8202;:</label>
            <div>
              <NumberInput id="noise-detail"v-model="mapbox.settings.noiseGrid" :max="100" :min="1" :step="1" />
            </div>
          </div>
        </div>
        <div :class="['footer', { 'footer-mobile': isMobile }]">
          <label class="amount" for="display-effect">Reflecting the amount of effect&#8202;:</label>
          <div class="toggle">
            <ToggleSwitch id="amount" v-model="mapbox.settings.applyEffectAmount" :name="'display-effect'" @change="toggleDisplayEffect" />
          </div>
          <label for="url">User Style URL&#8202;:</label>
          <div class="text-input">
            <input id="url" v-model="mapbox.settings.userStyleURL" />
          </div>
          <label for="token">Access Token&#8202;:</label>
          <div class="text-input">
            <input id="token" v-model="mapbox.settings.accessToken" />
          </div>
        </div>
      </OverlayScrollbars>
    </div>
  </ModalWindow>
</template>


<style lang="scss" scoped>
  #config-panel {
    position: relative;
  }
  h3 {
    font-size: 1rem;
    text-align: center;
    font-weight: 700;
    height: 2rem;
    margin-bottom: 1rem;
    line-height: 2;
  }
  .close {
    position: absolute;
    top: 6px;
    right: 6px;
  }
  .innerPanel {
    max-height: calc(100dvh - 14rem - 12px);
  }
  .main {
    display: flex;
    padding: 0 1rem;
    gap: 0 2rem;
    flex-wrap: wrap;
  }
  .item {
    display: grid;
    grid-template-columns: 9.625rem 6rem 1.375rem;
    gap: 1rem 0;
    position: relative;
    margin-bottom: 1rem;
    div {
      line-height: 2;
      height: 2rem;
      &:has(select) {
        position: relative;
        &::after {
          position: absolute;
          top: .8rem;
          right: .5rem;
          width: .625rem;
          height: .4375rem;
          background-color: $textAlt;
          clip-path: polygon(0 0, 100% 0, 50% 100%);
          content: '';
          pointer-events: none;
        }
      }
    }
  }
  label {
    position: relative;
    display: block;
    line-height: 2;
    grid-column-start: 1;
    padding-right: 1.5rem;
    min-width: 9.625rem;
  }
  .unit {
    text-align: right;
    padding-left: .5rem;
  }
  button, select, input {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    display: block;
  }
  select {
    width: 6rem;
    border-radius: .25rem;
    color: $textColor;
    padding-left: .5rem;
    height: 2rem;
    line-height: 2;
    background-color: $inputBg;
    font-size: 1rem;
    cursor: pointer;
    &:active, &:focus {
      background-color: $inputBgF;
    }
  }
  option {
    background: $optionTagColor;
  }
  input {
    width: 6rem;
    color: $textColor;
    padding: 0 .25rem;
    background-color: $inputBg;
    border-radius: .25rem;
    line-height: 2;
    height: 2rem;
    &:active, &:focus {
      background-color: $inputBgF;
    }
  }
  .text-input input {
    width: 100%;
  }
  input[input] {
    color: #FFA500;
  }
  input:disabled {
    color: $textDisabled;
    background-color: transparent;
  }
  .prefix::after {
      position: absolute;
      top: 0;
      right: 0;
      padding-right: .25rem;
      content: '\0B1';
    }
  .footer {
    display: grid;
    grid-template-columns: 9.625rem 6rem 1.375rem 2rem 9.625rem 6rem 1.375rem;
    padding: 0 1rem 1.5rem;
    gap: 1rem 0;
    div {
      line-height: 2;
      height: 2rem;
      :deep(.toggle-switch) {
        height: 1.5rem;
        margin: .25rem 0;
      }
    }
    .amount {
      grid-column: 1 / 5;
    }
    .text-input {
      grid-column: 2 / 7;
    }
  }
  .footer-mobile {
    gap: 1rem 0;
    grid-template-columns: 9.625rem 3.25rem 2.75rem 1.375rem;
    .amount {
      line-height: 1.5;
      grid-column: 1 / 3;
    }
    :deep(.toggle-switch) {
        margin: .75rem 0 !important;
      }
    .text-input {
      grid-column: 2 / 5;
    }
  }
</style>
