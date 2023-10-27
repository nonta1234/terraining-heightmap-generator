<script setup lang="ts">
import type { HeightCalcType } from '~/types/types'

const mapbox = useMapbox()
const { isMobile } = useDevice()

const contents = ref()
const defaultHeight = ref('auto')
const panelHeight = ref('auto')
// const scroll = ref(isWindows ? 'undefined' : 'scroll')

const visDesktop = ref(false)
const visMobile = ref(false)

const visibillity = computed(() => {
  if (isMobile) { return visMobile.value } else { return visDesktop.value }
})

const changeVisibillity = () => {
  if (isMobile) {
    visMobile.value = !visMobile.value
  } else {
    visDesktop.value = !visDesktop.value
  }
}

const controlDisabled = ref(false)

const rotate = ref(false)
const message = ref('')
const minHeight = ref('-')
const maxHeight = ref('-')

const maxSize = computed(() => mapSpec[mapbox.value.settings.gridInfo].size * 4)
const minSize = computed(() => mapSpec[mapbox.value.settings.gridInfo].size)

const hScale = computed(() => mapSpec[mapbox.value.settings.gridInfo].size / mapbox.value.settings.size)
const vScale = computed(() => mapbox.value.settings.vertScale)

const _sharpen = computed(() => mapbox.value.settings.sharpen)
const _shrpThres = computed(() => mapbox.value.settings.shrpThres)
const _shrpFade = computed(() => mapbox.value.settings.shrpFade)

const _smoothing = computed(() => mapbox.value.settings.smoothing)
const _smthThres = computed(() => mapbox.value.settings.smthThres)
const _smthFade = computed(() => mapbox.value.settings.smthFade)

const littoral = computed({
  get: () => mapbox.value.settings.littoral,
  set: (val) => {
    mapbox.value.settings.littoral = Math.round(val / 16) * 16
  },
})

const fixedS = computed({
  get: () => !mapbox.value.settings.fixedRatio,
  set: (val) => {
    mapbox.value.settings.fixedRatio = !val
  },
})

const ratio = computed({
  get: () => mapbox.value.settings.vertScale / hScale.value,
  set: (val) => {
    mapbox.value.settings.vertScale = val * hScale.value
  },
})

const limitCheck = () => {
  if (mapbox.value.settings.vertScale > 2.5) {
    mapbox.value.settings.vertScale = 2.5
  } else if (ratio.value > 10) {
    ratio.value = 10
  }
}

watch([ratio, vScale], () => {
  limitCheck()
  mapbox.value.map?.setTerrain()
  mapbox.value.map?.setTerrain({ source: 'terrain-dem', exaggeration: ratio.value })
})

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

useListen('map:changeLngLat', () => {
  minHeight.value = '-'
  maxHeight.value = '-'
})

useListen('map:changeMapSize', () => {
  minHeight.value = '-'
  maxHeight.value = '-'
})

useListen('debug:operate', () => {
  // console.log('debug:operate')
})

const refresh = async () => {
  rotate.value = true
  message.value = 'Downloading' + '\n' + 'elevation data.'
  const heightMap = await getHeightMap()
  message.value = ''
  const { min, max } = getMinMaxHeight(heightMap)
  minHeight.value = min.toFixed(1)
  maxHeight.value = max.toFixed(1)
  rotate.value = false
  if (mapbox.value.settings.adjLevel) {
    mapbox.value.settings.seaLevel = min
  }
  adjustElevation(max)
  saveSettings(mapbox.value.settings)
}

const onLngChange = (value: number) => {
  setGrid(mapbox, [value, mapbox.value.settings.lat], true)
}

const onLatChange = (value: number) => {
  setGrid(mapbox, [mapbox.value.settings.lng, value], true)
}

const onSizeChange = (value: number) => {
  const tmpRatio = ratio.value
  mapbox.value.settings.size = value
  if (mapbox.value.settings.fixedRatio) { ratio.value = tmpRatio }
  setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], true)
  useEvent('map:changeMapSize', value)
}

const onTypeChange = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  mapbox.value.settings.type = value as HeightCalcType
  if (mapbox.value.settings.type === 'maximize') {
    controlDisabled.value = true
  } else {
    controlDisabled.value = false
  }
}

const modalButtonText = ref('OPEN')

const modal = () => {
  useEvent('map:leModal')
}

useListen('map:leModal', () => {
  if (modalButtonText.value === 'OPEN') {
    modalButtonText.value = 'CLOSE'
  } else {
    modalButtonText.value = 'OPEN'
  }
})

onMounted(() => {
  if (mapbox.value.settings.type === 'maximize') {
    controlDisabled.value = true
  } else {
    controlDisabled.value = false
  }
  nextTick(() => {
    const { height } = getComputedStyle(contents.value)
    defaultHeight.value = '0'
    panelHeight.value = `calc(${height} + 2px)`
  })
})
</script>


<template>
  <div id="setting-panel">
    <section class="header">
      <button class="menu-bar fab" @click="changeVisibillity">
        <font-awesome-icon v-if="!visibillity" :icon="['fas', 'bars']" class="fa-fw fa-lg" />
        <font-awesome-icon v-else :icon="['fas', 'xmark']" class="fa-fw fa-xl" />
      </button>
      <div class="coordinates">
        <ul>
          <li><label>Lng&ThinSpace;:</label><NumberInput :value="mapbox.settings.lng" :max="180" :min="-180" :step="0.00001" @change="onLngChange" /></li>
          <li><label>Lat&ThinSpace;:</label><NumberInput :value="mapbox.settings.lat" :max="85.05112" :min="-85.05112" :step="0.00001" @change="onLatChange" /></li>
        </ul>
      </div>
    </section>
    <OverlayScrollbars :class="['setting', {'m-active': visMobile, 'd-active': visDesktop}]">
      <section ref="contents" class="contents">
        <div class="elevation section">
          <dl><dt>Min. Height&ThinSpace;:</dt><dd>{{ minHeight }}<span>m</span></dd></dl>
          <dl><dt>Max. Height&ThinSpace;:</dt><dd>{{ maxHeight }}<span>m</span></dd></dl>
        </div>
        <div class="section">
          <ul>
            <li><label>Map Size&ThinSpace;:</label><NumberInput :value="mapbox.settings.size" :max="maxSize" :min="minSize" :step="0.01" @change="onSizeChange" /><span>㎞</span></li>
            <li><label>Sea Level&ThinSpace;:</label><NumberInput v-model="mapbox.settings.seaLevel" :max="9999" :min="-9999" :step="0.1" /><span>m</span></li>
            <li><label>Adjust Level&ThinSpace;:</label><ToggleSwitch v-model="mapbox.settings.adjLevel" :name="'adjust-level'" /></li>
            <li>
              <label>Height Ratio&ThinSpace;:</label>
              <NumberInput v-model="ratio" :max="10" :min="0" :step="0.001" :disabled="controlDisabled" />
              <ToggleIcon v-model="mapbox.settings.fixedRatio" :name="'fixedRatio'" :disabled="controlDisabled" :icon="['fas', 'thumbtack']" :icon-class="'fa-sm fa-fw'" />
            </li>
            <li>
              <label>Height Scale&ThinSpace;:</label>
              <NumberInput v-model="mapbox.settings.vertScale" :max="2.5" :min="0" :step="0.001" :disabled="controlDisabled" />
              <ToggleIcon v-model="fixedS" :name="'fixedScale'" :disabled="controlDisabled" :icon="['fas', 'thumbtack']" :icon-class="'fa-sm fa-fw'" />
            </li>
            <li>
              <label>Elev. Type&ThinSpace;:</label>
              <select name="type" :value="mapbox.settings.type" @change="onTypeChange">
                <option value="manual">Manual</option>
                <option value="limit">Limit</option>
                <option value="maximize">Maxi.</option>
              </select><span></span>
            </li>
          </ul>
        </div>
        <div class="section">
          <ul>
            <li><label>Water Depth&ThinSpace;:</label><NumberInput v-model="mapbox.settings.depth" :max="100" :min="0" :step="1" /><span>m</span></li>
            <li><label>Littoral Length&ThinSpace;:</label><NumberInput v-model="littoral" :max="320" :min="16" :step="16" /><span>m</span></li>
            <li class="editor"><label>Littoral Editor&ThinSpace;:</label><button class="littoral-editor" @click="modal">{{ modalButtonText }}</button><span></span></li>
          </ul>
        </div>
        <div class="section">
          <ul>
            <li><label>Smoothing&ThinSpace;:</label><NumberInput v-model="mapbox.settings.smoothing" :max="100" :min="0" :step="1" /><span>%</span></li>
            <li><label>Threshold&ThinSpace;:</label><NumberInput v-model="mapbox.settings.smthThres" :max="10000" :min="0" :step="10" /><span>m</span></li>
            <li><label>Fade&ThinSpace;:</label><NumberInput v-model="mapbox.settings.smthFade" :max="1000" :min="0" :step="10" /><span>m</span></li>
          </ul>
        </div>
        <div class="section">
          <ul>
            <li><label>Sharpen&ThinSpace;:</label><NumberInput v-model="mapbox.settings.sharpen" :max="200" :min="0" :step="1" /><span>%</span></li>
            <li><label>Threshold&ThinSpace;:</label><NumberInput v-model="mapbox.settings.shrpThres" :max="10000" :min="0" :step="10" /><span>m</span></li>
            <li><label>Fade&ThinSpace;:</label><NumberInput v-model="mapbox.settings.shrpFade" :max="1000" :min="0" :step="10" /><span>m</span></li>
          </ul>
        </div>
        <div class="section footer">
          <p class="message">{{ message }}</p>
          <button class="refresh fab" @click="refresh">
            <font-awesome-icon v-if="!rotate" :icon="['fas', 'arrows-rotate']" class="fa-fw fa-lg" />
            <font-awesome-icon v-else :icon="['fas', 'arrows-rotate']" class="fa-fw fa-lg fa-spin" />
          </button>
        </div>
      </section>
    </OverlayScrollbars>
  </div>
</template>


<style lang="scss" scoped>
  #setting-panel {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 14.75rem;
    border-radius: .375rem;
    color: $textColor;
    font-size: 1rem;
    z-index: 2;
    transition: .4s ease;
    user-select: none;
    @include grass;
  }
  :deep(.setting) {
    height: v-bind(defaultHeight);
    max-height: v-bind(defaultHeight);
    transition: .4s ease;
    // overflow-y: hidden;
    &.d-active {
      height: v-bind(panelHeight);
      max-height: calc(100dvh - 4.5rem - 40px);
      // overflow-y: auto;
    }
    &.m-active {
      height: v-bind(panelHeight);
      max-height: calc(100dvh - 5.5rem - 110px);
      // overflow-y: auto;
    }
  }
  .contents {
    margin-top: -10px;
    padding: 0 .75rem;
  }
  .section {
    margin-top: .75rem;
    padding-top: .75rem;
    border-top: solid 1px $borderColor;
  }

  label {
    display: block;
    background-color: transparent;
    line-height: 1.875;
    font-size: 1rem;
    width: 100%;
  }
  button, select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    display: block;
    flex-shrink: 0;
  }
  input {
    width: 4rem;
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
  select {
    width: 4rem;
    flex-shrink: 0;
    border-radius: .25rem;
    color: $textColor;
    padding-left: .25rem;
    line-height: 1.71429;
    background-color: $inputBg;
    font-size: .875rem;
    cursor: pointer;
    &:active, &:focus {
      background-color: $inputBgF;
    }
  }
  .fab {
    color: $textColor;
    height: 2.5rem;
    width: 2.5rem;
    border-radius: 1.25rem;
    text-align: center;
    background-color: rgba(255, 255, 255, .2);
    line-height: 1;
    cursor: pointer;
    @include shadow-2;
    &:hover, &:focus {
      color: aquamarine;
      background-color: rgba(0, 206, 209, .35);
      @include shadow-3;
    }
    svg {
      margin: auto;
    }
  }
  .littoral-editor {
    color: $textColor;
    height: 1.5rem;
    width: 4rem;
    font-size: .875rem;
    border-radius: .25rem;
    line-height: 1.714285;
    background-color: rgba(255, 255, 255, .1);
    border: solid 1px $borderColor;
    &:hover {
      cursor: pointer;
    }
    &:hover, &:focus {
      color: aquamarine;
      background-color: rgba(0, 206, 209, .35);
    }
  }
  ul li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  span {
    display: inline-block;
    width: 1.375rem;
    text-align: right;
    flex-shrink: 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: .5rem .75rem;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    padding: .875rem 0;
  }
  .coordinates {
    label {
      margin-right: .5rem;
      line-height: 1.5;
    }
    input {
      background-color: transparent;
      width: 6.5rem;
      flex-shrink: 0;
      &:active {
        background-color: $inputBgF;
      }
      &:focus {
        background-color: $inputBgF;
      }
    }
  }
  .elevation {
    dl {
      display: flex;
      justify-content: space-between;
    }
    dt {
      display: inline-block;
    }
    dd {
      display: inline-block;
      font-feature-settings: "tnum";
      font-size: .9375rem;
      flex-shrink: 0;
    }
  }
  .toggle-switch {
    align-self: center;
    margin-right: 1.375rem;
    flex-shrink: 0;
  }
  .toggle-icon {
    width: 1.375rem;
    flex-shrink: 0;
    :deep(i) {
      width: 1.375rem;
      text-align: right;
    }
  }
  .message {
    width: 100%;
    font-size: .875rem;
    white-space: pre-line;
    color: #9BA0A5;
    line-height: 1.4;
  }
  .editor{
    padding-top: .375rem;
  }
</style>
