<script setup lang="ts">
import { mapSpec } from '~/utils/const'

const mapbox = useMapbox()
const esDisabled = computed(() => mapbox.value.settings.gridInfo === 'cs1')
const maxSize = computed(() => (mapSpec[mapbox.value.settings.gridInfo].defaultSize || 25.000) * 4)
const minSize = computed(() => (mapSpec[mapbox.value.settings.gridInfo].defaultSize || 1.000) / 2)
const hScale = computed(() => (mapSpec[mapbox.value.settings.gridInfo].defaultSize || mapbox.value.settings.size) / mapbox.value.settings.size)
const vScale = computed(() => mapbox.value.settings.vertScale)
const ratioScalelDisabled = computed(() => mapbox.value.settings.type === 'maximize')

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

const onMapTypeChange = async () => {
  await nextTick()
  if (mapbox.value.settings.gridInfo !== 'cs1' && mapbox.value.settings.accessTokenMT === '') {
    alert(needToken(mapbox.value.settings.gridInfo))
  }
  if (mapbox.value.settings.gridInfo !== 'ue') {
    mapbox.value.settings.worldPartition = false
  }
  if (mapbox.value.settings.gridInfo === 'unity' || mapbox.value.settings.gridInfo === 'ue') {
    if (mapbox.value.map?.getLayer('playArea')) {
      mapbox.value.map?.removeLayer('playArea')
      mapbox.value.map?.removeSource('play')
    }
  }
  else {
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
  useEvent('panel:updateHeight')
}

const changeMapSize = (size: number) => {
  const tmpRatio = ratio.value
  mapbox.value.settings.size = size
  if (mapbox.value.settings.fixedRatio) {
    ratio.value = tmpRatio
  }
  setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], true)
  useEvent('map:changeMapSize', size)
}

const onSizeReset = () => {
  changeMapSize(mapSpec[mapbox.value.settings.gridInfo].defaultSize || 10.000)
  ratio.value = 1
}

const onSizeChange = () => {
  changeMapSize(mapbox.value.settings.size)
}

const onWorldPartitionChange = () => {
  if (mapbox.value.settings.worldPartition) {
    mapbox.value.settings.resolution = mapbox.value.settings.wpCells * 510 + 1
  }
  else {
    mapbox.value.settings.resolution = mapSpec[mapbox.value.settings.gridInfo].defaultRes
  }
  saveSettings(mapbox.value.settings)
}

const onCellsChange = () => {
  mapbox.value.settings.resolution = (mapbox.value.settings.wpCells * 511) - (mapbox.value.settings.wpCells - 1)
}

const onSubdivisionToggle = () => {
  nextTick()
  useEvent('panel:updateHeight')
}
</script>

<template>
  <div class="controls">
    <label for="map-type">Map Type&#8202;:</label>
    <SelectMenu
      id="map-type"
      v-model="mapbox.settings.gridInfo"
      class="gap"
      :options="[
        { value: 'cs1', label: 'CS1' },
        { value: 'cs2', label: 'CS2' },
        { value: 'unity', label: 'Unity' },
        { value: 'ue', label: 'UE' },
      ]"
      @change="onMapTypeChange()"
    />
    <div class="size-label">
      <label for="map-size">Map Size&#8202;:</label>
      <button class="size-reset" title="Reset Size" @click="onSizeReset"><font-awesome-icon :icon="['fas', 'arrow-rotate-right']" class="fa-fw fa-xs" /></button>
    </div>
    <NumberInput id="map-size" v-model="mapbox.settings.size" :max="maxSize" :min="minSize" :step="0.001" unit="㎞" @change="onSizeChange" />
    <label for="resolution">Resolution&#8202;:</label>
    <SelectMenu v-if="!mapbox.settings.worldPartition" id="resolution" v-model="mapbox.settings.resolution" class="tnum gap" :options="mapSpec[mapbox.settings.gridInfo].resolutions" />
    <NumberInput v-else id="resolution" v-model="mapbox.settings.resolution" class="wp-resolution gap" disabled />
    <label for="elev-scale">Elev. Scale&#8202;:</label>
    <NumberInput id="elev-scale" ref="elevationScale" v-model="mapbox.settings.elevationScale" :max="100000" :min="0" :step="0.001" :disabled="esDisabled" unit="m" class="elev-scale" />
    <template v-if="mapbox.settings.gridInfo === 'ue'">
      <label for="world-partition" class="wp">World Partition&#8202;:</label>
      <ToggleSwitch v-model="mapbox.settings.worldPartition" name="world-partition" class="wp-switch" @change="onWorldPartitionChange" />
      <label for="wp-cells">Cells&#8202;:</label>
      <NumberInput id="wp-cells" v-model="mapbox.settings.wpCells" :max="32" :min="1" :step="1" class="wp-cells-input" :disabled="!mapbox.settings.worldPartition" :text-hidden="!mapbox.settings.worldPartition" @change="onCellsChange" />
    </template>
    <label for="base-level">Base Level&#8202;:</label>
    <NumberInput id="base-level" v-model="mapbox.settings.baseLevel" class="gap" :max="9999" :min="-9999" :step="0.1" unit="m" />
    <label for="adjust-level">Adjust Level&#8202;:</label>
    <ToggleSwitch v-model="mapbox.settings.adjToMin" name="adjust-level" />
    <label for="height-ratio">Height Ratio&#8202;:</label>
    <NumberInput id="height-ratio" v-model="ratio" class="gap" :max="100" :min="0" :step="0.001" :disabled="ratioScalelDisabled" :text-hidden="ratioScalelDisabled">
      <ToggleIcon v-model="mapbox.settings.fixedRatio" :name="'fixedRatio'" :disabled="ratioScalelDisabled" :icon="['fas', 'thumbtack']" :icon-class="'fa-sm fa-fw'" />
    </NumberInput>
    <label for="height-scale">Height Scale&#8202;:</label>
    <NumberInput id="height-scale" v-model="mapbox.settings.vertScale" :max="100" :min="0" :step="0.001" :disabled="ratioScalelDisabled" :text-hidden="ratioScalelDisabled">
      <ToggleIcon v-model="fixedScale" :name="'fixedScale'" :disabled="ratioScalelDisabled" :icon="['fas', 'thumbtack']" :icon-class="'fa-sm fa-fw'" />
    </NumberInput>
    <label for="elev-type">Elev. Type&#8202;:</label>
    <SelectMenu id="elev-type" v-model="mapbox.settings.type" class="gap"
      :options="[
        { value: 'manual', label: 'Manual' },
        { value: 'limit', label: 'Limit' },
        { value: 'maximize', label: 'Maximize' },
      ]"
    />
    <label for="interpolation">Interpolation&#8202;:</label>
    <SelectMenu id="interpolation" v-model="mapbox.settings.interpolation"
      :options="[
        { value: 'bilinear', label: 'Bilinear' },
        { value: 'bicubic', label: 'Bicubic' },
      ]"
    />
    <hr>
    <details class="subdivision" @toggle="onSubdivisionToggle">
      <summary>Tile Subdivision Process</summary>
      <div class="subdivision-controls">
        <label for="subdivision">Subdivision&#8202;:</label>
        <ToggleSwitch v-model="mapbox.settings.subdivision" name="subdivision" class="sd-switch" />
        <label for="subdivision-count">Level&#8202;:</label>
        <SelectMenu id="subdivision-count" v-model="mapbox.settings.subdivisionCount"
          :options="[
            { value: 1, label: 'x2' },
            { value: 2, label: 'x4' },
          ]"
        />
        <label for="edge-sensitivity">Sensitivity&#8202;:</label>
        <SelectMenu id="edge-sensitivity" v-model="mapbox.settings.kernelNumber"
          class="gap"
          :options="[
            { value: 4, label: 'Soft' },
            { value: 16, label: 'Balanced' },
            { value: 64, label: 'Sharp' },
          ]"
        />
      </div>
    </details>
  </div>
</template>

<style lang="scss" scoped>
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

.size-label {
  display: flex;
  justify-content: space-between;
  height: 1.875rem;
}

.size-reset {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  display: block;
  margin: .25rem 0;
  color: $textColor;
  height: 1.375rem;
  width: calc(1.375rem - 1px);
  border-radius: .25rem;
  background-color: rgba(255, 255, 255, .1);
  border: solid 1px $borderColor;
  margin-right: 6px;

  &:hover {
    cursor: pointer;
  }

  &:hover,
  &:focus {
    color: aquamarine;
    background-color: rgba(0, 206, 209, .35);
  }

  svg {
    margin-bottom: 5px;
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
    grid-row: 3 / 4;
    z-index: 5;
  }

  .wp-switch {
    grid-column: 2 / 3;
    grid-row: 3 / 4;
    z-index: 10;
    margin: auto 1rem auto auto !important;
  }

  .sd-switch {
    margin: auto 1rem auto auto !important;
  }

  :deep(.gap) {
    width: calc(100% - 1rem) !important;
  }
}

:deep(.wp-resolution) {
  .input:disabled {
    color: $textColor !important;
  }
}

.subdivision {
  grid-column: 1 / 5;

  @media screen and (max-width: 524px) {
    grid-column: 1 / 3;
  }

  summary {
    cursor: pointer;
    outline: none;
    margin-bottom: .125rem;
    line-height: 1.5;

    &:focus, &:hover {
      color: aquamarine;
    }
  }
}

.subdivision-controls {
  display: grid;
  width: 100%;
  gap: .75rem 0;
  grid-template-columns: 6.25rem 7.25rem 6.25rem 6.25rem;
  line-height: 1.875;
  margin: .25rem 0;

  @media screen and (min-width: 525px) {
    :deep(.toggle-switch) {
      margin: auto 1rem auto auto !important;
    }
  }

  @media screen and (max-width: 524px) {
    grid-template-columns: 1fr 7rem;
  }
}
</style>
