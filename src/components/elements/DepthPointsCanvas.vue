<script setup lang="ts">
const mapbox = useMapbox()
const depthPointsContainer = ref<HTMLDivElement>()
const depthCanvas = ref<HTMLCanvasElement>()
const depthCtx = ref<CanvasRenderingContext2D>()

const previewWidth = ref(0)
const previewHeight = ref(0)
const padding = 8
const selectedPoint = ref(-1)
const isDrag = ref(false)
const isAddMode = ref(true)

const isDeleteMode = computed({
  get: () => !isAddMode.value,
  set: value => isAddMode.value = !value,
})

const clickBuffer = ref(0.1)
const touchBuffer = ref(0.1)

const selectedPointValue = computed({
  get: () => selectedPoint.value === -1 ? undefined : mapbox.value.settings.depthPoints[selectedPoint.value]?.depth,
  set: (value) => {
    if (value && selectedPoint.value !== -1) {
      mapbox.value.settings.depthPoints[selectedPoint.value].depth = value
    }
  },
})

const prevention = (e: Event) => {
  e.preventDefault()
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

const update = () => {
  depthCtx.value!.clearRect(0, 0, depthCtx.value!.canvas.width, depthCtx.value!.canvas.height)
  for (let i = 0; i < mapbox.value.settings.depthPoints.length; i++) {
    depthCtx.value!.fillStyle = i === selectedPoint.value ? 'dodgerblue' : 'lightskyblue'
    depthCtx.value!.beginPath()
    const x = (mapbox.value.settings.depthPoints[i].x * (previewWidth.value - 1)) + padding
    const y = (mapbox.value.settings.depthPoints[i].y * (previewHeight.value - 1)) + padding
    depthCtx.value!.arc(x, y, 7, 0, Math.PI * 2, false)
    depthCtx.value!.fill()
  }
}

const getNormalizedPoint = (x: number, y: number) => {
  const rect = depthCanvas.value!.getBoundingClientRect()
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

const onMouseDown = (e: MouseEvent) => {
  if (e.button === 0) {
    e.preventDefault()
    const { x, y } = getNormalizedPoint(e.clientX, e.clientY)
    const index = getPointIndex(x, y, clickBuffer.value)

    if (isAddMode.value && index !== -1) {
      isDrag.value = true
      selectedPoint.value = index
      document.addEventListener('mousemove', onMouseMove)
    }
    document.addEventListener('mouseup', onMouseUp, { once: true })
  }
}

const onMouseMove = (e: MouseEvent) => {
  if (isDrag.value) {
    e.preventDefault()
    const { x, y } = getNormalizedPoint(e.clientX, e.clientY)
    if (selectedPoint.value > 3) {
      mapbox.value.settings.depthPoints[selectedPoint.value].x = x
      mapbox.value.settings.depthPoints[selectedPoint.value].y = y
    }
    update()
  }
}

const onMouseUp = (e: MouseEvent) => {
  e.preventDefault()
  if (isDrag.value) {
    isDrag.value = false
    document.removeEventListener('mousemove', onMouseMove)
  } else {
    const { x, y } = getNormalizedPoint(e.clientX, e.clientY)
    const index = getPointIndex(x, y, clickBuffer.value)

    if (isDeleteMode.value) {
      if (index > 3) {
        mapbox.value.settings.depthPoints.splice(index, 1)
        selectedPoint.value = -1
      }
    } else {
      if (index === -1) {
        mapbox.value.settings.depthPoints.push({ x, y, depth: 0 })
        selectedPoint.value = mapbox.value.settings.depthPoints.length - 1
      } else {
        selectedPoint.value = index
      }
    }
  }
  update()
  saveSettings(mapbox.value.settings)
}

const onTouchStart = (e: TouchEvent) => {
  const { x, y } = getNormalizedPoint(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
  const index = getPointIndex(x, y, touchBuffer.value)

  if (isAddMode.value && index !== -1) {
    isDrag.value = true
    selectedPoint.value = index
    document.addEventListener('touchmove', onTouchMove)
  }
  document.addEventListener('touchend', onTouchEnd, { once: true })
}

const onTouchMove = (e: TouchEvent) => {
  if (isDrag.value) {
    const { x, y } = getNormalizedPoint(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
    if (selectedPoint.value > 3) {
      mapbox.value.settings.depthPoints[selectedPoint.value].x = x
      mapbox.value.settings.depthPoints[selectedPoint.value].y = y
    }
    update()
  }
}

const onTouchEnd = (e: TouchEvent) => {
  if (isDrag.value) {
    isDrag.value = false
    document.removeEventListener('touchmove', onTouchMove)
  } else {
    const { x, y } = getNormalizedPoint(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
    const index = getPointIndex(x, y, touchBuffer.value)

    if (isDeleteMode.value) {
      if (index > 3) {
        mapbox.value.settings.depthPoints.splice(index, 1)
        selectedPoint.value = -1
      }
    } else {
      if (index === -1) {
        mapbox.value.settings.depthPoints.push({ x, y, depth: 0 })
        selectedPoint.value = mapbox.value.settings.depthPoints.length - 1
      } else {
        selectedPoint.value = index
      }
    }
  }
  update()
  saveSettings(mapbox.value.settings)
}

const setCanvasSize = () => {
  const size = depthPointsContainer.value!.clientWidth
  depthCanvas.value!.width = size
  depthCanvas.value!.height = size
  previewWidth.value = size - padding * 2
  previewHeight.value = size - padding * 2

  clickBuffer.value = Math.min(0.1, 9 / (previewWidth.value - 1))
  touchBuffer.value = Math.min(0.1, 13 / (previewWidth.value - 1))
  update()
}

const onResize = () => {
  setCanvasSize()
}

const clearCanvas = (ctx: CanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.canvas.width = 0
  ctx.canvas.height = 0
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  depthCtx.value = depthCanvas.value!.getContext('2d') as CanvasRenderingContext2D
  setCanvasSize()
})

onUnmounted(() => {
  clearCanvas(depthCtx.value!)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div ref="depthPointsContainer" class="depth-points-canvas-container">
    <canvas id="depth-points-canvas" ref="depthCanvas" @mousedown="onMouseDown" @touchstart="onTouchStart" @contextmenu="prevention"></canvas>
    <div class="control">
      <ToggleIcon v-model="isAddMode" class="button mode-button" :name="'addMode'" :icon="['fas', 'plus']" :icon-class="'fa-sm fa-fw'" :no-shadow="true" title="Add Point" />
      <ToggleIcon v-model="isDeleteMode" class="button mode-button" :name="'deleteMode'" :icon="['fas', 'minus']" :icon-class="'fa-sm fa-fw'" :no-shadow="true" title="Delete Point" />
      <label class="input-label" for="depth-correction">Depth Corr&#8202;:</label>
      <NumberInput v-model="selectedPointValue" class="depth-correction-input"
        :max="100" :min="0" :step="1" :disabled="selectedPointValue === undefined" unit="m" />
      <button class="button" title="Delete All" @click="deleteAll"><TrashIcon /></button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
canvas {
  width: 100%;
  aspect-ratio: 1;
}

#depth-points-canvas {
  width: 100%;
  aspect-ratio: 1;
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
    :deep(.label) {
      color: aquamarine !important;
    }

    background-color: rgba(0, 206, 209, .35) !important;
  }
}
</style>
