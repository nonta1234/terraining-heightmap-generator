<script setup lang="ts">
const mapbox = useMapbox()

const heightmapTypeRef = ref<HTMLSelectElement>()
const interpolationRef = ref<HTMLSelectElement>()

onMounted(() => {
  heightmapTypeRef.value!.value = mapbox.value.settings.gridInfo
  interpolationRef.value!.value = mapbox.value.settings.interpolation
})

const onHeightmapTypeChange = () => {
  mapbox.value.settings.size = mapSpec[mapbox.value.settings.gridInfo].size
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
  useEvent('map:cpModal', false)
  setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
  saveSettings(mapbox.value.settings)
}
</script>


<template>
  <ModalWindow>
    <div id="config-panel">
      <h3>Configuration</h3>
      <div class="main">
        <ul>
          <li>
            <label>
              <span>Heightmap Type&#8202;:</span>
              <span><select ref="heightmapTypeRef" v-model="mapbox.settings.gridInfo" name="heightmapType" @change="onHeightmapTypeChange">
                <option value="cs1">CS1</option>
                <option value="cs2">CS2</option>
              </select></span>
            </label>
          </li>
          <li>
            <label>
              <span>Interpolation&#8202;:</span>
              <span><select ref="interpolationRef" v-model="mapbox.settings.interpolation" name="interpolation">
                <option value="bilinear">Bilinear</option>
                <option value="bicubic">Bicubic</option>
              </select></span>
            </label>
          </li>
          <li>
            <label>
              <span>Elevation Scale&#8202;:</span>
              <NumberInput v-model="mapbox.settings.elevationScale" :max="100000" :min="0" :step="0.001" /><span>m</span>
            </label>
          </li>
          <li>
            <label>
              <span>Stream Depth&#8202;:</span>
              <NumberInput v-model="mapbox.settings.streamDepth" :max="100" :min="0" :step="1" /><span>m</span>
            </label>
          </li>
          <li>
            <label>
              <span>Smooth Count&#8202;:</span>
              <NumberInput v-model="mapbox.settings.smoothCount" :max="20" :min="1" :step="1" />
            </label>
          </li>
          <li>
            <label>
              <span>Noise Value&#8202;:</span><span class="prefix">&plusmn;</span>
              <NumberInput v-model="mapbox.settings.noise" :max="100" :min="0" :step="1" /><span>m</span>
            </label>
          </li>
          <li>
            <label>
              <span>Noise Detail&#8202;:</span>
              <NumberInput v-model="mapbox.settings.noiseGrid" :max="100" :min="1" :step="1" />
            </label>
          </li>
          <li>
            <label class="amount">
              <span>Reflecting the<br>amount of effect&#8202;:</span>
              <ToggleSwitch v-model="mapbox.settings.applyEffectAmount" :name="'display-effect'" @change="toggleDisplayEffect" />
            </label>
          </li>
          <li>
            <label>
              <span>Access Token&#8202;:</span>
              <input v-model="mapbox.settings.accessToken" class="access-token" />
            </label>
          </li>
        </ul>
        <button class="close" @click="close">CLOSE</button>
      </div>
    </div>
  </ModalWindow>
</template>


<style lang="scss" scoped>
  h3 {
    font-size: 1rem;
    text-align: center;
    font-weight: 700;
    padding: .5rem 0 1rem;
    line-height: 1;
  }
  .main {
    padding: 0 1rem 1rem;
  }
  ul, li {
    display: block;
  }
  label {
    width: 16rem;
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: nowrap;
    height: 2rem;
    line-height: 2;
    &:has(input) {
      height: 1.5rem;
      line-height: 1.5;
      &.amount {
        height: 3rem;
      }
    }
    span {
      display: block;
      white-space: nowrap;
      flex-shrink: 0;
      &.prefix {
        width: 1.25rem;
        text-align: center;
      }
      &:first-child {
        width: 8.75rem;
        &:has(+ .prefix) {
          width: 7.5rem;
        }
      }
      &:last-child:not(:has(select)) {
        width: 1.25rem;
        text-align: right;
      }
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
  button, select, .access-token {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    display: block;
    flex-shrink: 0;
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
    flex-shrink: 0;
    &:active, &:focus {
      background-color: $inputBgF;
    }
  }
  input {
    width: 6rem;
    color: $textColor;
    padding: 0 .25rem;
    background-color: $inputBg;
    border-radius: .25rem;
    line-height: 1.5;
    flex-shrink: 0;
    &:active, &:focus {
      background-color: $inputBgF;
    }
  }
  input[input] {
    color: #FFA500;
  }
  input:disabled {
    color: $textDisabled;
    background-color: transparent;
  }
  .access-token {

  }
  .close {
    height: 2.25rem;
    border-radius: .25rem;
    padding: 0 1rem;
    font-size: 1rem;
    line-height: 2.125;
    text-align: center;
    border: solid 1px $borderColor;
    background-color: rgba(255, 255, 255, .1);
    color: $textColor;
    margin: 1.5rem 0 0 auto;
    cursor: pointer;
    &:hover, &:focus {
      color: aquamarine;
      background-color: rgba(0, 206, 209, .35);
    }
  }
</style>
