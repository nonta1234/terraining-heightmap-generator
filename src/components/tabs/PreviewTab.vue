<script setup lang="ts">
import { isMtTokenValid } from '~/utils/isTokenValid'
import type { Canvases } from '~/types/types'
import effectWasm, { type InitOutput } from '~~/effects_lib/pkg'

const mapbox = useMapbox()
const { isMobile } = useDevice()
const decimal = isMobile ? 1 : 4
const previewCanvas = ref<HTMLCanvasElement>()
const gl = ref<WebGL2RenderingContext | null>()
const previewBox = ref<HTMLElement>()
const { initialize, previewData, setMapData, generate } = usePreview()
const isDownloading = ref(false)
const isProcessing = ref(false)
const total = ref(0)
const progress = ref(0)
const progressMsg = computed(() => {
  let msg = ''
  if (isProcessing.value) {
    msg = 'Generating elevation data.'
  } else if (isDownloading.value) {
    msg = `Downloading elevation data. ${progress.value} / ${total.value}`
  }
  return msg
})

const isOverflow = computed(() => previewData.value.max - previewData.value.min > mapbox.value.settings.elevationScale)
const effectInstance = ref<InitOutput>()

const scaleXY = computed(() => mapbox.value.settings.size * 100000 / (mapbox.value.settings.resolution - 1))
const scaleZ = computed(() => mapbox.value.settings.elevationScale * 100 / 512)

useListen('tile:total', (number: number) => {
  total.value += number
})

useListen('tile:progress', () => {
  progress.value += 1
})

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

const setImageBitmap = (canvas: OffscreenCanvas, image: ImageBitmap) => {
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('bitmaprenderer')
  ctx!.transferFromImageBitmap(image)
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
  if (previewCanvas.value && gl.value) {
    renderCanvas(previewCanvas.value, gl.value, previewData.value.previewMap!, min, max, scale)
  }
}

const onNormalizeChange = async () => {
  await render(mapbox.value.settings.normalizePreview)
}

const onPreview = async () => {
  const t0 = window.performance.now()
  let t1 = 0
  if (!isMtTokenValid()) {
    alert('MapTiler API key required.')
    return
  }
  if (mapbox.value.settings.useMapbox && !isMbTokenValid()) {
    alert('A mapbox access token is required to get the heightmap from mapbox.')
    return
  }

  try {
    const { debugMode } = useDebug()
    isDownloading.value = true
    const res = mapbox.value.settings.originalPreview ? mapbox.value.settings.resolution : Math.min(getResolution(), mapbox.value.settings.resolution)
    const resScale = res / mapbox.value.settings.resolution
    const smoothRadius = mapbox.value.settings.smoothRadius * resScale
    const sharpenRadius = mapbox.value.settings.sharpenRadius * resScale

    if (mapbox.value.settings.actualSeafloor) {
      const [{ heightmap }, { heightmap: oceanMap }, { waterMap, waterWayMap, waterMapImage, waterWayMapImage }] = await Promise.all([
        getHeightmap(mapbox.value.settings.gridInfo, debugMode.value, res),
        getHeightmap('ocean', false, res),
        getWaterMap(mapbox.value.settings.gridInfo, false, debugMode.value, res),
      ])

      t1 = window.performance.now()
      isProcessing.value = true
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 30))
      const mixedHeightmap = mixArray(heightmap, oceanMap)

      const [blurredMap, sharpenMap] = await Promise.all([
        gaussianBlur(effectInstance.value, mixedHeightmap, smoothRadius, mapbox.value.settings.smoothing / 100),
        unsharpMask(effectInstance.value, mixedHeightmap, mapbox.value.settings.sharpen / 100, sharpenRadius),
      ])

      setMapData(mixedHeightmap, blurredMap, sharpenMap, waterMap, waterWayMap)

      if (debugMode.value) {
        const { osWaterCanvas, osWaterWayCanvas } = useState<Canvases>('canvases').value
        setImageBitmap(osWaterCanvas, waterMapImage!)
        setImageBitmap(osWaterWayCanvas, waterWayMapImage!)
      }
    } else {
      const [{ heightmap }, { waterMap, waterWayMap, waterMapImage, waterWayMapImage }] = await Promise.all([
        getHeightmap(mapbox.value.settings.gridInfo, debugMode.value, res),
        getWaterMap(mapbox.value.settings.gridInfo, true, debugMode.value, res),
      ])

      t1 = window.performance.now()
      isProcessing.value = true
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 30))

      const [blurredMap, sharpenMap] = await Promise.all([
        gaussianBlur(effectInstance.value, heightmap, smoothRadius, mapbox.value.settings.smoothing / 100),
        unsharpMask(effectInstance.value, heightmap, mapbox.value.settings.sharpen / 100, sharpenRadius),
      ])

      setMapData(heightmap, blurredMap, sharpenMap, waterMap, waterWayMap)

      if (debugMode.value) {
        const { osWaterCanvas, osWaterWayCanvas } = useState<Canvases>('canvases').value
        setImageBitmap(osWaterCanvas, waterMapImage!)
        setImageBitmap(osWaterWayCanvas, waterWayMapImage!)
      }
    }

    await render(mapbox.value.settings.normalizePreview)

    const t2 = window.performance.now()
    const grid = getGrid(
      mapSpec[mapbox.value.settings.gridInfo].grid,
      mapbox.value.settings.lng,
      mapbox.value.settings.lat,
      mapbox.value.settings.size,
      mapbox.value.settings.angle,
    )
    const corners = getPoint(grid)
    console.log(`Preview - Download: ${(t1 - t0).toFixed(0)}ms`, `Processing: ${(t2 - t1).toFixed(0)}ms`, `Total: ${(t2 - t0).toFixed(0)}ms`)
    console.table(corners.gridCorner)
    console.table(corners.playAreaCorner)
    saveSettings(mapbox.value.settings)
  } catch (e) {
    console.error('Failed to generate preview data.:', e)
  } finally {
    isDownloading.value = false
    isProcessing.value = false
    total.value = 0
    progress.value = 0
  }
}

onMounted(async () => {
  await initialize()
  effectInstance.value = await effectWasm()
  gl.value = previewCanvas.value?.getContext('webgl2', {
    alpha: false,
    antialias: false,
  })
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
      <div :class="['min-max', { 'overflow': isOverflow }]">
        <div class="min">Min&#8202;: {{ previewData.min.toFixed(1) }}&#8201;m</div>
        <div class="max">Max&#8202;: {{ previewData.max.toFixed(1) }}&#8201;m</div>
      </div>
    </div>
    <div v-if="mapbox.settings.gridInfo === 'ue'" class="scale">
      <span>Scale&#8202;:</span>
      <span>X&#8202;: {{ scaleXY.toFixed(decimal) }}</span>
      <span>Y&#8202;: {{ scaleXY.toFixed(decimal) }}</span>
      <span>Z&#8202;: {{ scaleZ.toFixed(decimal) }}</span>
    </div>
    <slot />
    <footer class="footer">
      <div class="message"><span v-if="isProcessing || isDownloading">{{ progressMsg }}</span></div>
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

.overflow {
  color: #FFA500;
}

.min, .max {
  width: 50%;
}

.scale {
  margin-bottom: .5rem;

  span {
    margin-right: 1.5rem;

    @media screen and (max-width: 524px) {
      margin-right: .75rem;
    }
  }
}

.footer {
  display: flex;
  justify-content: space-between;
}

.message {
  width: 100%;
  color: $textAlt;
}

.visibility {
  display: none;
}

.preview-btn {
  flex-shrink: 0;
  @include common-button;
}
</style>
