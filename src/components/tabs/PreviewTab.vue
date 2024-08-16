<script setup lang="ts">
const mapbox = useMapbox()
const previewCanvas = ref<HTMLCanvasElement>()
const previewBox = ref<HTMLElement>()
const { initialize, previewData, setMapData, generate } = usePreview()
const message = ref('')

const scaleXY = computed(() => mapbox.value.settings.size * 100000 / (mapbox.value.settings.resolution - 1))
const scaleZ = computed(() => mapbox.value.settings.elevationScale * 100 / 512)

const getResolution = () => {
  const rect = previewBox.value?.getBoundingClientRect()
  let res = Math.floor(rect!.width * window.devicePixelRatio)
  if (mapbox.value.settings.gridInfo === 'cs2') {
    res = res + (res % 2)
  } else {
    res = res + (res % 2) + 1
  }
  return res
}

const prevention = (e: Event) => {
  e.preventDefault()
}

const render = async (normalize: boolean) => {
  const result = await generate()
  if (!result) {
    return
  }
  if (mapbox.value.settings.adjToMin) {
    mapbox.value.settings.baseLevel = previewData.value.min
  }
  const min = normalize ? previewData.value.min : mapbox.value.settings.baseLevel
  const max = normalize ? previewData.value.max : mapbox.value.settings.elevationScale + mapbox.value.settings.baseLevel
  const scale = normalize ? 1 : mapbox.value.settings.vertScale
  renderCanvas(previewCanvas.value!, previewData.value.previewMap!, min, max, scale)
}

const onNormalizeChange = async () => {
  await render(mapbox.value.settings.normalizePreview)
}

const onPreview = async () => {
  message.value = 'Downloading elevation data.'
  const res = mapbox.value.settings.originalPreview ? mapbox.value.settings.resolution : Math.min(getResolution(), mapbox.value.settings.resolution)
  if (mapbox.value.settings.actualSeafloor) {
    const [{ heightmap }, { heightmap: waterMap }, { waterWayMap }] = await Promise.all([
      getHeightmap(mapbox.value.settings.gridInfo, true, false, res),
      getHeightmap('ocean', true, false, res),
      getWaterMap(mapbox.value.settings.gridInfo, true, false, res),
    ])
    setMapData(heightmap, waterMap, waterWayMap)
  } else {
    const [{ heightmap }, { waterMap, waterWayMap }] = await Promise.all([
      getHeightmap(mapbox.value.settings.gridInfo, true, false, res),
      getWaterMap(mapbox.value.settings.gridInfo, true, false, res),
    ])
    setMapData(heightmap, waterMap, waterWayMap)
  }
  await render(mapbox.value.settings.normalizePreview)
  message.value = ''
}

onMounted(async () => {
  await initialize()
})
</script>

<template>
  <div id="preview-tab">
    <div ref="previewBox" class="preview-canvas-wrapper">
      <canvas ref="previewCanvas" class="preview-canvas" @contextmenu="prevention"></canvas>
      <div class="cover" @contextmenu="prevention"></div>
    </div>
    <div class="normalize">
      <label class="normalize-label" for="normalize-preview">Normalize&#8202;:&nbsp;&nbsp;</label>
      <ToggleSwitch v-model="mapbox.settings.normalizePreview" :name="'normalize-preview'" @change="onNormalizeChange" />
      <div class="min-max">
        <div class="min">Min&#8202;: {{ previewData.min.toFixed(1) }}&#8201;m</div>
        <div class="max">Max&#8202;: {{ previewData.max.toFixed(1) }}&#8201;m</div>
      </div>
    </div>
    <div v-if="mapbox.settings.gridInfo === 'ue'" class="scale">Scale&#8202;:&nbsp;&nbsp;X&#8202;: {{ scaleXY.toFixed(4) }}&nbsp;&nbsp;Y&#8202;: {{ scaleXY.toFixed(4) }}&nbsp;&nbsp;Z&#8202;: {{ scaleZ.toFixed(4) }}</div>
    <slot />
    <footer class="footer">
      <div class="message">{{ message }}</div>
      <button class="preview-btn" @click="onPreview">Preview</button>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
#preview-tab {
  width: 100%;
}

.preview-canvas-wrapper {
  position: relative;
  margin-bottom: .5rem;
}

.preview-canvas {
  width: 100%;
  aspect-ratio: 1;
  background-color: #000;
}

.cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.normalize {
  display: flex;
  flex-wrap: nowrap;

  @media screen and (max-width: 524px) {
    flex-wrap: wrap;
  }
}

.normalize-label {
  display: block;
  flex-shrink: 0;
  margin-bottom: .5rem;
}

:deep(.toggle-switch) {
  flex-shrink: 0;
  margin-right: 2rem;
  margin-bottom: .5rem;
}

.min-max {
  display: flex;
  width: 100%;
  margin-bottom: .5rem;
}

.min, .max {
  width: 50%;
}

.scale {
  margin-bottom: .5rem;
}

.footer {
  display: flex;
  justify-content: space-between;
}

.message {
  color: $textAlt;
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
