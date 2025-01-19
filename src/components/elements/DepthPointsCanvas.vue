<script setup lang="ts">
import Delaunator from 'delaunator'
import { setParameters } from '@luma.gl/gltools'

const mapbox = useMapbox()
const depthContainer = ref<HTMLDivElement>()
const depthPointsCanvas = ref<HTMLCanvasElement>()
const depthPointsCtx = ref<CanvasRenderingContext2D>()
const depthCanvas = ref<HTMLCanvasElement>()
const gl = ref<WebGL2RenderingContext>()

const previewWidth = ref(0)
const previewHeight = ref(0)
const padding = 8
const selectedPoint = ref(-1)
const isDragging = ref(false)
const isAddMode = ref(true)

const isDeleteMode = computed({
  get: () => !isAddMode.value,
  set: value => isAddMode.value = !value,
})

const drawLines = ref(true)

const clickBuffer = ref(0.1)
const touchBuffer = ref(0.1)

const currentValue = ref<number>()

watch(selectedPoint, (value) => {
  currentValue.value = value !== -1 ? mapbox.value.settings.depthPoints[value].depth : undefined
})

const updateDepthValue = (value: number) => {
  if (selectedPoint.value !== -1) {
    mapbox.value.settings.depthPoints[selectedPoint.value].depth = value
    saveSettings(mapbox.value.settings)
  }
  update()
}

const generateLinePositions = (delaunay: Delaunator<any>): Float32Array => {
  const linePositions: number[] = []

  for (let e = 0; e < delaunay.halfedges.length; e++) {
    const oppositeEdge = delaunay.halfedges[e]
    if (oppositeEdge > e) continue

    const p = delaunay.triangles[e]
    const q = delaunay.triangles[(e % 3 === 2) ? e - 2 : e + 1]

    linePositions.push(delaunay.coords[p * 2], delaunay.coords[p * 2 + 1])
    linePositions.push(delaunay.coords[q * 2], delaunay.coords[q * 2 + 1])
  }

  return new Float32Array(linePositions)
}

const delaunay = ref(
  Delaunator.from(
    mapbox.value.settings.depthPoints,
    point => point.x,
    point => point.y,
  ),
)

const updateDepth = () => {
  delaunay.value = Delaunator.from(
    mapbox.value.settings.depthPoints,
    point => point.x,
    point => point.y,
  )

  const depthsData = mapbox.value.settings.depthPoints.map(point => point.depth)

  const positions = new Float32Array(delaunay.value.coords)
  const depths = new Float32Array(depthsData)
  const indices = new Uint32Array(delaunay.value.triangles)
  const linePositions = drawLines.value ? generateLinePositions(delaunay.value) : undefined

  if (depthCanvas.value && gl.value) {
    renderDepthCanvas(gl.value, positions, depths, indices, linePositions)
  }
}

const deleteAll = () => {
  if (confirm('Are you sure you want to delete all depth points?')) {
    mapbox.value.settings.depthPoints = [
      { x: 0, y: 0, depth: 0 },
      { x: 1, y: 0, depth: 0 },
      { x: 0, y: 1, depth: 0 },
      { x: 1, y: 1, depth: 0 },
    ]
    selectedPoint.value = -1
    update()
    saveSettings(mapbox.value.settings)
  }
}

const updatePoints = () => {
  depthPointsCtx.value!.clearRect(0, 0, depthPointsCtx.value!.canvas.width, depthPointsCtx.value!.canvas.height)
  for (let i = 0; i < mapbox.value.settings.depthPoints.length; i++) {
    depthPointsCtx.value!.fillStyle = i === selectedPoint.value ? 'dodgerblue' : 'lightskyblue'
    depthPointsCtx.value!.beginPath()
    const x = (mapbox.value.settings.depthPoints[i].x * (previewWidth.value - 1)) + padding
    const y = (mapbox.value.settings.depthPoints[i].y * (previewHeight.value - 1)) + padding
    depthPointsCtx.value!.arc(x, y, 7, 0, Math.PI * 2, false)
    depthPointsCtx.value!.fill()
  }
}

const update = () => {
  updatePoints()
  updateDepth()
}

const getNormalizedPoint = (x: number, y: number) => {
  const rect = depthPointsCanvas.value!.getBoundingClientRect()
  const normX = Math.max(Math.min((x - rect.left - padding) / (previewWidth.value - 1), 1), 0)
  const normY = Math.max(Math.min((y - rect.top - padding) / (previewHeight.value - 1), 1), 0)
  return { x: normX, y: normY }
}

const getPointIndex = (x: number, y: number, buffer: number) => {
  for (let i = 0; i < mapbox.value.settings.depthPoints.length; i++) {
    const point = mapbox.value.settings.depthPoints[i]
    const dx = point.x - x
    const dy = point.y - y
    if (Math.sqrt(dx * dx + dy * dy) < buffer) {
      return i
    }
  }
  return -1
}

const activePointerId: Ref<number | null> = ref(null)

const onPointerdown = (e: PointerEvent) => {
  e.preventDefault()
  if (activePointerId.value === null && e.isPrimary) {
    if (e.button === 0 || e.pointerType === 'touch') {
      const { x, y } = getNormalizedPoint(e.clientX, e.clientY)
      const index = getPointIndex(x, y, e.pointerType === 'touch' ? touchBuffer.value : clickBuffer.value)
      console.log(index)
      if (isAddMode.value && index > 3) {
        depthPointsCanvas.value!.style.touchAction = 'none'
        isDragging.value = true
        activePointerId.value = e.pointerId
        depthPointsCanvas.value?.setPointerCapture(e.pointerId)
        document.addEventListener('pointermove', onPointerMove, { passive: false })
      } else {
        activePointerId.value = e.pointerId
      }
      selectedPoint.value = index
    } else if (e.button === 2) {
      activePointerId.value = e.pointerId
    }
    document.addEventListener('pointerup', onPointerUp, { once: true })
    update()
  }
}

const onPointerMove = (e: PointerEvent) => {
  e.preventDefault()
  if (isDragging.value && e.pointerId === activePointerId.value) {
    const { x, y } = getNormalizedPoint(e.clientX, e.clientY)
    mapbox.value.settings.depthPoints[selectedPoint.value].x = x
    mapbox.value.settings.depthPoints[selectedPoint.value].y = y
    update()
  }
}

const onPointerUp = (e: PointerEvent) => {
  e.preventDefault()
  if (e.pointerId === activePointerId.value) {
    if (e.button === 0 || e.pointerType === 'touch') {
      if (isAddMode.value) {
        if (selectedPoint.value === -1 && document.elementFromPoint(e.clientX, e.clientY) === depthPointsCanvas.value) {
          const { x, y } = getNormalizedPoint(e.clientX, e.clientY)
          mapbox.value.settings.depthPoints.push({ x, y, depth: 0 })
          selectedPoint.value = mapbox.value.settings.depthPoints.length - 1
        } else {
          isDragging.value = false
          depthPointsCanvas.value?.releasePointerCapture(e.pointerId)
          depthPointsCanvas.value!.style.touchAction = 'auto'
        }
      } else {
        if (selectedPoint.value > 3 && document.elementFromPoint(e.clientX, e.clientY) === depthPointsCanvas.value) {
          const { x, y } = getNormalizedPoint(e.clientX, e.clientY)
          const index = getPointIndex(x, y, e.pointerType === 'touch' ? touchBuffer.value : clickBuffer.value)
          if (selectedPoint.value === index) {
            mapbox.value.settings.depthPoints.splice(index, 1)
            selectedPoint.value = -1
          }
        }
      }
      saveSettings(mapbox.value.settings)
    } else if (e.button === 2) {
      drawLines.value = !drawLines.value
    }
    activePointerId.value = null
    document.removeEventListener('pointermove', onPointerMove)
    update()
  }
}

const onContextMenu = (e: Event) => {
  e.preventDefault()
}

const setCanvasSize = () => {
  const size = depthContainer.value!.clientWidth
  depthPointsCanvas.value!.width = size
  depthPointsCanvas.value!.height = size
  previewWidth.value = size - padding * 2
  previewHeight.value = size - padding * 2

  depthCanvas.value!.width = size - padding * 2
  depthCanvas.value!.height = size - padding * 2
  gl.value?.viewport(0, 0, gl.value.drawingBufferWidth, gl.value.drawingBufferHeight)

  clickBuffer.value = Math.min(0.1, 9 / previewWidth.value)
  touchBuffer.value = Math.min(0.1, 13 / previewWidth.value)
  update()
}

const onResize = () => {
  setCanvasSize()
}

const clearCanvas = () => {
  depthPointsCtx.value?.clearRect(0, 0, depthPointsCtx.value!.canvas.width, depthPointsCtx.value!.canvas.height)
  depthPointsCtx.value!.canvas.width = 0
  depthPointsCtx.value!.canvas.height = 0
  gl.value?.clearColor(0, 0, 0, 0)
  gl.value!.canvas.width = 0
  gl.value!.canvas.height = 0
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  depthPointsCtx.value = depthPointsCanvas.value!.getContext('2d') as CanvasRenderingContext2D
  gl.value = depthCanvas.value?.getContext('webgl2', {
    alpha: true,
    antialias: true,
  }) as WebGL2RenderingContext

  setParameters(gl.value, {
    blend: true,
    blendFunc: [gl.value.SRC_ALPHA, gl.value.ONE_MINUS_SRC_ALPHA],
  })
  setCanvasSize()
})

onUnmounted(() => {
  clearCanvas()
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div ref="depthContainer" class="depth-container">
    <canvas id="depth-canvas" ref="depthCanvas"></canvas>
    <canvas id="depth-points-canvas" ref="depthPointsCanvas"
      @pointerdown="onPointerdown"
      @touchstart="(e) => e.preventDefault()"
      @contextmenu="onContextMenu"
    ></canvas>
    <div class="control">
      <ToggleIcon v-model="isAddMode" class="button mode-button" :name="'addMode'" :icon="['fas', 'plus']" :icon-class="'fa-sm fa-fw'" :no-shadow="true" title="Add Point" />
      <ToggleIcon v-model="isDeleteMode" class="button mode-button" :name="'deleteMode'" :icon="['fas', 'minus']" :icon-class="'fa-sm fa-fw'" :no-shadow="true" title="Delete Point" />
      <label class="input-label" for="depth-correction">Depth Corr&#8202;:</label>
      <NumberInput :key="selectedPoint" :value="currentValue" class="depth-correction-input"
        :max="100" :min="0" :step="1" :disabled="selectedPoint === -1" unit="m" @change="updateDepthValue" />
      <button class="button" title="Delete All" @click="deleteAll"><TrashIcon /></button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
canvas {
  width: 100%;
  aspect-ratio: 1;
}

.depth-container {
  position: relative;
}

#depth-points-canvas {
  position: absolute;
  top: 0;
  left: 0;
}

#depth-canvas {
  padding: 8px;
}

.control {
  display: flex;
  justify-content: flex-end;
  margin-right: 8px;
  margin-left: 8px;
  height: 1.875rem;
  line-height: 1.875;
  flex-wrap: nowrap;

  @include layout {
    margin-top: 2rem;
    justify-content: space-between;
  }
}

.input-label {
  margin-left: .5rem;
}

.depth-correction-input {
  margin: 0 .5rem .25rem;
  width: 4.5rem !important;

  &:has(.input:disabled) {
    background-color: $inputBg !important;

    :deep(.input) {
      color: transparent !important;
    }
  }
}

.button {
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

  &:hover {
    cursor: pointer;
  }

  &:hover,
  &:focus {
    color: aquamarine;
    background-color: rgba(0, 206, 209, .35);
  }
}

.mode-button {
  height: 1.375rem;
  width: 1.375rem;
  margin-right: .5rem;

  :deep(.label) {
    width: 1.375rem;
    height: 1.375rem;

    svg {
      margin-left: 1px;
      margin-bottom: 5px;
    }
  }

  &:has(.input:checked) {
    background-color: rgba(255, 255, 255, .2);
    border: solid 1px $borderColor3;
  }

  &:hover {
    cursor: pointer;
  }

  &:hover,
  &:focus {
    background-color: rgba(0, 206, 209, .35) !important;

    :deep(.label) {
      color: aquamarine !important;
    }
  }
}
</style>
