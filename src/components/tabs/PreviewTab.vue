<script setup lang="ts">
import { isMtTokenValid } from '~/utils/isTokenValid'
import type { Settings, Canvases, ResultType } from '~/types/types'

const mapbox = useMapbox()
const { isMobile } = useDevice()
const decimal = isMobile ? 1 : 4
const previewCanvas = ref<HTMLCanvasElement>()
const gl = ref<WebGL2RenderingContext | null>()
const previewBox = ref<HTMLElement>()

const previewData = ref<ResultType>({
  heightmap: new Float32Array(),
  waterMapImage: undefined,
  waterWayMapImage: undefined,
  min: 0,
  max: 0,
})

const isDownloading = ref(false)
const total = ref(0)
const progress = ref(0)
const message = ref('')
const progressMsg = computed(() => {
  const msg = message.value ? message.value : `Downloading elevation data: ${progress.value} / ${total.value}`
  return msg
})

const isOverflow = computed(() => (
  previewData.value.max - previewData.value.min - mapbox.value.settings.baseLevel) * mapbox.value.settings.vertScale > mapbox.value.settings.elevationScale,
)

const scaleXY = computed(() => mapbox.value.settings.size * 100000 / (mapbox.value.settings.resolution - 1))
const scaleZ = computed(() => mapbox.value.settings.elevationScale * 100 / 512)

useListen('isDownload', (value: boolean) => {
  isDownloading.value = value
})

useListen('message:reset', () => {
  message.value = ''
  total.value = 0
  progress.value = 0
})

useListen('message:total', (number: number) => {
  message.value = ''
  total.value += number
})

useListen('message:progress', () => {
  message.value = ''
  progress.value += 1
})

useListen('message:phase', (data: string) => {
  message.value = data
})

const getResolution = () => {
  const rect = previewBox.value?.getBoundingClientRect()
  const res = Math.floor(rect!.width * window.devicePixelRatio)
  const correction = mapSpec[mapbox.value.settings.gridInfo].correction
  return res + (res % 2) + correction
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

const render = (normalize: boolean) => {
  if (previewData.value.heightmap.length === 0) {
    return
  }
  if (mapbox.value.settings.adjToMin) {
    mapbox.value.settings.baseLevel = previewData.value.min
  }
  const min = normalize ? previewData.value.min : mapbox.value.settings.baseLevel
  const max = normalize ? previewData.value.max : mapbox.value.settings.elevationScale + mapbox.value.settings.baseLevel
  const scale = normalize ? 1 : mapbox.value.settings.vertScale
  if (previewCanvas.value && gl.value) {
    renderCanvas(previewCanvas.value, gl.value, previewData.value.heightmap, min, max, scale)
  }
}

const onNormalizeChange = () => {
  render(mapbox.value.settings.normalizePreview)
}

const onPreview = async () => {
  if (!isMtTokenValid()) {
    alert('MapTiler API key required.')
    return
  }
  if (mapbox.value.settings.useMapbox && !isMbTokenValid()) {
    alert('A mapbox access token is required to get the heightmap from mapbox.')
    return
  }

  try {
    console.time('Preview')
    const worker = useWorker()
    const { debugMode } = useDebug()

    previewData.value.heightmap = new Float32Array()
    previewData.value.waterMapImage = undefined
    previewData.value.waterWayMapImage = undefined
    previewData.value.min = 0
    previewData.value.max = 0
    message.value = ''
    total.value = 0
    progress.value = 0

    const _resolution = mapbox.value.settings.originalPreview ? mapbox.value.settings.resolution : Math.min(getResolution(), mapbox.value.settings.resolution)
    const plainSettings: Settings = JSON.parse(JSON.stringify(mapbox.value.settings))

    isDownloading.value = true

    previewData.value = await worker.value?.generateMap(
      'preview',
      plainSettings,
      _resolution,
      debugMode.value,
    ) as ResultType

    render(mapbox.value.settings.normalizePreview)

    console.timeEnd('Preview')

    if (debugMode.value) {
      const { osWaterCanvas, osWaterWayCanvas } = useState<Canvases>('canvases').value
      if (previewData.value.waterMapImage) setImageBitmap(osWaterCanvas, previewData.value.waterMapImage)
      if (previewData.value.waterWayMapImage) setImageBitmap(osWaterWayCanvas, previewData.value.waterWayMapImage!)
    }

    const grid = getGrid(
      mapSpec[mapbox.value.settings.gridInfo].grid,
      mapbox.value.settings.lng,
      mapbox.value.settings.lat,
      mapbox.value.settings.size,
      mapbox.value.settings.angle,
    )

    const corners = getPoint(grid)
    console.table(JSON.parse(JSON.stringify(corners.gridCorner)))
    if (corners.playAreaCorner) console.table(JSON.parse(JSON.stringify(corners.playAreaCorner)))
    saveSettings(mapbox.value.settings)
  } catch (e) {
    console.error('Failed to generate preview data.:', e)
  } finally {
    setTimeout(() => isDownloading.value = false, 3000)
  }
}

onMounted(() => {
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
      <div class="message"><span v-if="isDownloading">{{ progressMsg }}</span></div>
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
