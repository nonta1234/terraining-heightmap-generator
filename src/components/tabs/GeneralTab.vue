<script setup lang="ts">
const mapbox = useMapbox()
const previewCanvasRef = ref<HTMLCanvasElement>()
const ratioScalelDisabled = ref(false)

const esDisabled = computed(() => mapbox.value.settings.gridInfo === 'cs1')
const maxSize = computed(() => (mapSpec[mapbox.value.settings.gridInfo].defaultSize || 25.000) * 4)
const minSize = computed(() => (mapSpec[mapbox.value.settings.gridInfo].defaultSize || 1.000) / 2)
const hScale = computed(() => (mapSpec[mapbox.value.settings.gridInfo].defaultSize || mapbox.value.settings.size) / mapbox.value.settings.size)
const vScale = computed(() => mapbox.value.settings.vertScale)

const fixedScale = computed({
  get: () => !mapbox.value.settings.fixedRatio,
  set: (val) => {
    mapbox.value.settings.fixedRatio = !val
  },
})

const ratio = computed({
  get: () => mapbox.value.settings.vertScale / hScale.value,
  set: (value) => {
    mapbox.value.settings.vertScale = value * hScale.value
  },
})

watch([ratio, vScale], () => {
  mapbox.value.map?.setTerrain()
  mapbox.value.map?.setTerrain({ source: 'terrain-dem', exaggeration: ratio.value })
})

const onMapTypeChange = () => {
  if (mapbox.value.settings.gridInfo !== 'cs1' && mapbox.value.settings.accessToken === '') {
    alert(needToken(mapbox.value.settings.gridInfo))
  }
  if (mapbox.value.settings.gridInfo !== 'ue' ) {
    mapbox.value.settings.worldPartition = false
  }
  if (mapbox.value.settings.gridInfo === 'unity' || mapbox.value.settings.gridInfo === 'ue') {
    if (mapbox.value.map?.getLayer('playArea')) {
      mapbox.value.map?.removeLayer('playArea')
      mapbox.value.map?.removeSource('play')
    }
  } else {
    if (!mapbox.value.map?.getLayer('playArea')) {
      mapbox.value.map?.addSource('play', {
        type: 'geojson',
        data: mapbox.value.grid?.playArea,
      })
      mapbox.value.map?.addLayer({
        id: 'playArea',
        type: 'fill',
        source: 'play',
        paint: {
          'fill-color': 'green',
          'fill-opacity': 0.23,
        },
      })
    }
  }
  mapbox.value.settings.elevationScale = mapSpec[mapbox.value.settings.gridInfo].defaultEs
  mapbox.value.settings.resolution = mapSpec[mapbox.value.settings.gridInfo].defaultRes
  onSizeReset()
  setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
  saveSettings(mapbox.value.settings)
}

const changeMapSize = (size: number) => {
  const tmpRatio = ratio.value
  mapbox.value.settings.size = size
  if (mapbox.value.settings.fixedRatio) { ratio.value = tmpRatio }
  setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], true)
  useEvent('map:changeMapSize', size)
}

const onSizeReset = () => {
  changeMapSize(mapSpec[mapbox.value.settings.gridInfo].defaultSize || 10.000)
  ratio.value = 1
}

const onSizeChange = (value: number) => {
  changeMapSize(value)
}

const onElevTypeChange = () => {
  ratioScalelDisabled.value = mapbox.value.settings.type === 'maximize'
}

const onWorldPartitionChange = () => {
  if (mapbox.value.settings.worldPartition) {
    mapbox.value.settings.resolution = (mapbox.value.settings.wpCells * 511) - (mapbox.value.settings.wpCells - 1)
  } else {
    mapbox.value.settings.resolution = mapSpec[mapbox.value.settings.gridInfo].defaultRes
  }
  saveSettings(mapbox.value.settings)
}

const onCellsChange = () => {
  mapbox.value.settings.resolution = (mapbox.value.settings.wpCells * 511) - (mapbox.value.settings.wpCells - 1) 
}

const onPreview = () => {

}

onMounted(() => {
  const canvas = previewCanvasRef.value!.transferControlToOffscreen()
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
  useState('heightmap-canvas', () => ctx)



})

onUnmounted(() => {
  const ctxRef = useState<OffscreenCanvasRenderingContext2D>('heightmap-canvas')
  ctxRef.value.clearRect(0, 0, ctxRef.value.canvas.width, ctxRef.value.canvas.height)
  ctxRef.value.canvas.width = 0
  ctxRef.value.canvas.height = 0
})
</script>


<template>
  <div id="general-tab">
    <canvas ref="previewCanvasRef" class="preview-canvas"></canvas>
    <div class="controls">
      <label for="map-type">Map Type&#8202;:</label>
      <SelectMenu
        :id="'map-type'"
        v-model="mapbox.settings.gridInfo"
        :list="[
          { value: 'cs1', label: 'CS1' },
          { value: 'cs2', label: 'CS2' },
          { value: 'unity', label: 'Unity' },
          { value: 'ue', label: 'UE' },
        ]"
        @change="onMapTypeChange"
      />
      <span class="unit"></span>
      <div class="size-label">
        <label for="map-size">Map Size&#8202;:</label>
        <button class="size-reset" @click="onSizeReset"><font-awesome-icon :icon="['fas', 'arrow-rotate-right']" class="fa-fw fa-xs" /></button>
      </div>
      <NumberInput id="map-size" :value="mapbox.settings.size" :max="maxSize" :min="minSize" :step="0.001" @change="onSizeChange" />
      <span class="unit">㎞</span>
      <label for="resolution">Resolution&#8202;:</label>
      <SelectMenu
        v-if="!mapbox.settings.worldPartition"
        :id="'resolution'"
        v-model="mapbox.settings.resolution"
        :list="mapSpec[mapbox.settings.gridInfo].resolutions"
        class="tnum"
      />
      <NumberInput v-else id="resolution" :value="mapbox.settings.resolution" class="wp-resolution" disabled />
      <span class="unit">px</span>
      <label for="elev-scale">Elev. Scale&#8202;:</label>
      <NumberInput id="elev-scale" ref="elevationScale" v-model="mapbox.settings.elevationScale" :max="100000" :min="0" :step="0.001" :disabled="esDisabled" class="elev-scale" />   
      <span class="unit">m</span>
      <template v-if="mapbox.settings.gridInfo === 'ue'">
        <label for="world-partition" class="wp">World Partition&#8202;:</label>
        <ToggleSwitch v-model="mapbox.settings.worldPartition" :name="'world-partition'" class="wp-switch" @change="onWorldPartitionChange" />
        <span class="unit"></span>
        <label for="wp-cells">Cells&#8202;:</label>
        <NumberInput id="wp-cells" v-model="mapbox.settings.wpCells" :max="32" :min="1" :step="1" class="wp-cells-input" :disabled="!mapbox.settings.worldPartition" @change="onCellsChange" />   
        <span class="unit"></span>
      </template>
      <label for="sea-level">Sea Level&#8202;:</label>
      <NumberInput id="sea-level" v-model="mapbox.settings.seaLevel" :max="9999" :min="-9999" :step="0.1" />
      <span class="unit">m</span>
      <label for="adjust-level">Adjust Level&#8202;:</label>
      <ToggleSwitch v-model="mapbox.settings.adjLevel" :name="'adjust-level'" />
      <span class="unit"></span>
      <label for="height-ratio">Height Ratio&#8202;:</label>
      <NumberInput id="height-ratio" v-model="ratio" :max="100" :min="0" :step="0.001" :disabled="ratioScalelDisabled" />
      <ToggleIcon v-model="mapbox.settings.fixedRatio" :name="'fixedRatio'" :disabled="ratioScalelDisabled" :icon="['fas', 'thumbtack']" :icon-class="'fa-sm fa-fw'" class="unit" />
      <label for="height-scale">Height Scale&#8202;:</label>
      <NumberInput id="height-scale" v-model="mapbox.settings.vertScale" :max="100" :min="0" :step="0.001" :disabled="ratioScalelDisabled" />
      <ToggleIcon v-model="fixedScale" :name="'fixedScale'" :disabled="ratioScalelDisabled" :icon="['fas', 'thumbtack']" :icon-class="'fa-sm fa-fw'" class="unit pl0" />
      <label for="elev-type">Elev. Type&#8202;:</label>
      <SelectMenu
        :id="'elev-type'"
        v-model="mapbox.settings.type"
        :list="[
          { value: 'manual', label: 'Manual' },
          { value: 'limit', label: 'Limit' },
          { value: 'maximize', label: 'Maxi.' },
        ]"
        @change="onElevTypeChange"
      />
      <span class="unit"></span>
      <label for="interpolation">Interpolation&#8202;:</label>
      <SelectMenu
        :id="'interpolation'"
        v-model="mapbox.settings.interpolation"
        :list="[
          { value: 'bilinear', label: 'Bilinear' },
          { value: 'bicubic', label: 'Bicubic' },
        ]"
      />
      <span class="unit"></span>
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
  margin-bottom: 1rem;
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
  &:hover, &:focus {
    color: aquamarine;
    background-color: rgba(0, 206, 209, .35);
    @include shadow-3;
  }
}
.controls {
  display: grid;
  position: relative;
  width: 100%;
  gap: .75rem 0;
  grid-template-columns: 6.25rem 5rem 2.875rem 6.25rem 5rem 1.375rem;
  line-height: 2;
  margin-bottom: 1.5rem;
  @media screen and (max-width: 524px) {
    margin-bottom: 1.5rem;
    grid-template-columns: 1fr 6rem 1.375rem;
  }
}
.unit {
  display: block;
  line-height: 2;
  padding-left: .25rem;
}
:deep(.select-menu) {
  width: 100%;
}
.size-label {
  display: flex;
  justify-content: space-between;
  height: 2rem;
}
:deep(.toggle-switch) {
  margin: auto 0;
}
.size-reset {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  display: block;
  margin: auto 0;
  color: $textColor;
  height: 1.375rem;
  width: 21px;
  border-radius: .25rem;
  background-color: rgba(255, 255, 255, .1);
  border: solid 1px $borderColor;
  margin-right: 6px;
  &:hover {
    cursor: pointer;
  }
  &:hover, &:focus {
    color: aquamarine;
    background-color: rgba(0, 206, 209, .35);
  }
  svg {
    margin-bottom: 6px;
  }
}
.elev-scale:disabled {
  color: $textColor !important;
}
.tnum {
  font-feature-settings: "tnum";
}
@media screen and (min-width: 525px) {
  .wp {
    grid-column: 1 / 3;
    z-index: 5;
  }
  .wp-switch {
    position: absolute;
    grid-column: 2 / 3;
    grid-row: 3 / 4;
    z-index: 10;
    top: .25rem;
    right: 0;
  }
}
.wp-cells-input:disabled {
  opacity: 0;
}
.wp-resolution:disabled {
  color: $textColor !important;
}
</style>
