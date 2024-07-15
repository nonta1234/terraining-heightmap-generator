<script setup lang="ts">
const mapbox = useMapbox()
const { isMobile } = useDevice()

const mobileView = ref(isMobile)

const gCanvas = ref<HTMLCanvasElement>()
const oCanvas = ref<HTMLCanvasElement>()

const gCtx = ref<CanvasRenderingContext2D>()
const oCtx = ref<CanvasRenderingContext2D>()

const padding = [10, 0, 10, 0]    // top, right, bottom, left
const displayPadding = [10, 0, 10, 0]
const cellCount = 10
const hGridSize = ref(0)
const vGridSize = ref(0)
const clientHeight = ref(0)
const hPositions: Array<number> = []
let windowWidth = window.innerWidth

type circle = {
  x: number;
  y: Ref<number>;
}

const points: Array<circle> = []
let selectedPoint = -1

useListen('map:leModal', () => {
  drawGrid(gCtx.value!)
  drawPoints(oCtx.value!)
})

useListen('modal:changeLittArray', () => {
  drawPoints(oCtx.value!)
})

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.strokeStyle = '#606164'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < cellCount + 1; i++) {
    ctx.moveTo(hPositions[i], displayPadding[0])
    ctx.lineTo(hPositions[i], ctx.canvas.height - displayPadding[2])
  }
  for (let i = 0; i < cellCount + 1; i++) {
    ctx.moveTo(padding[3], (i * vGridSize.value) + displayPadding[0])
    ctx.lineTo(ctx.canvas.width - padding[1], (i * vGridSize.value) + displayPadding[0])
  }
  ctx.stroke()
}


function drawPoints(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.strokeStyle = '#9BA0A5'
  ctx.lineWidth = 3
  const calcPoints = [
    { x: displayPadding[3] - hGridSize.value, y: ref(points[0].y) } as circle,
    { x: displayPadding[3], y: ref(ctx.canvas.height - displayPadding[2]) } as circle,
    ...points,
    { x: ctx.canvas.width - displayPadding[1], y: ref(displayPadding[0]) } as circle,
    { x: ctx.canvas.width - displayPadding[1] + hGridSize.value, y: ref(points[points.length - 1].y) } as circle,
  ]
  const i6 = 1 / 6

  ctx.beginPath()

  ctx.moveTo(calcPoints[1].x, calcPoints[1].y.value)

  for (let i = 2; i < points.length + 3; i++) {
    const p0 = calcPoints[i - 2]
    const p1 = calcPoints[i - 1]
    const p2 = calcPoints[i]
    const p3 = calcPoints[i + 1]
    ctx.bezierCurveTo(
      p2.x * i6 + p1.x - p0.x * i6,
      p2.y.value * i6 + p1.y.value - p0.y.value * i6,
      p3.x * -i6 + p2.x + p1.x * i6,
      p3.y.value * -i6 + p2.y.value + p1.y.value * i6,
      p2.x,
      p2.y.value,
    )
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.fillStyle = 'lightskyblue'
  for (let i = 0; i < points.length; i++) {
    ctx.beginPath()
    ctx.arc(points[i].x, points[i].y.value, 7, 0, Math.PI * 2, false)
    ctx.fill()
  }
}


const mouseDown = (e: MouseEvent) => {
  if (e.button === 0) {
    e.preventDefault()
    const mouseX = e.clientX - oCanvas.value!.getBoundingClientRect().left
    const mouseY = e.clientY - oCanvas.value!.getBoundingClientRect().top

    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y.value, 2))

      if (distance <= 9) {
        selectedPoint = i
        document.addEventListener('mousemove', mouseMove)
        document.addEventListener('mouseup', mouseUp, { once: true })
        break
      }
    }
  }
}

const touchStart = (e: TouchEvent) => {
  e.preventDefault()
  const toucheX = e.changedTouches[0].clientX - oCanvas.value!.getBoundingClientRect().left
  const toucheY = e.changedTouches[0].clientY - oCanvas.value!.getBoundingClientRect().top

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const distance = Math.sqrt(Math.pow(toucheX - point.x, 2) + Math.pow(toucheY - point.y.value, 2))

    if (distance <= 13) {
      selectedPoint = i
      document.addEventListener('touchmove', touchMove)
      document.addEventListener('touchend', touchEnd, { once: true })
      break
    }
  }
}

const mouseMove = (e: MouseEvent) => {
  if (selectedPoint !== -1) {
    e.preventDefault()
    const mouseY = e.clientY - oCanvas.value!.getBoundingClientRect().top
    if (mouseY >= 0 && mouseY <= oCanvas.value!.height) {
      let value = mouseY - displayPadding[0]
      value = Math.min(Math.max(value, 0), clientHeight.value)
      mapbox.value.settings.littArray[selectedPoint] = (clientHeight.value - value) / clientHeight.value
      drawPoints(oCtx.value!)
      useEvent('modal:pointDragged')
    }
  }
}

const touchMove = (e: TouchEvent) => {
  if (selectedPoint !== -1) {
    e.preventDefault()
    const toucheY = e.changedTouches[0].clientY - oCanvas.value!.getBoundingClientRect().top
    if (toucheY >= 0 && toucheY <= oCanvas.value!.height) {
      let value = toucheY - displayPadding[0]
      value = Math.min(Math.max(value, 0), clientHeight.value)
      mapbox.value.settings.littArray[selectedPoint] = (clientHeight.value - value) / clientHeight.value
      drawPoints(oCtx.value!)
      useEvent('modal:pointDragged')
    }
  }
}

const mouseUp = (e: MouseEvent) => {
  e.preventDefault()
  document.removeEventListener('mousemove', mouseMove)
  selectedPoint = -1
}

const touchEnd = (e: TouchEvent) => {
  e.preventDefault()
  document.removeEventListener('touchmove', touchMove)
  selectedPoint = -1
}


const setCanvasSize = () => {
  if (isMobile) {
    gCanvas.value!.width = windowWidth - remToPx(2) - 22
    gCanvas.value!.height = gCanvas.value!.width * 0.75 + padding[0] + padding[2]
    oCanvas.value!.width = gCanvas.value!.width
    oCanvas.value!.height = gCanvas.value!.height
  } else {
    gCanvas.value!.width = 400
    gCanvas.value!.height = 320
    oCanvas.value!.width = 400
    oCanvas.value!.height = 320
  }

  hGridSize.value = Math.floor((gCanvas.value!.width - padding[1] - padding[3]) / cellCount)
  const hRemaining = Math.floor((gCanvas.value!.width - padding[1] - padding[3] - hGridSize.value * cellCount) / 2)
  vGridSize.value = Math.floor((gCanvas.value!.height - padding[0] - padding[2]) / cellCount)
  const vRemaining = Math.floor((gCanvas.value!.height - padding[0] - padding[2] - vGridSize.value * cellCount) / 2)

  displayPadding[0] = padding[0] + vRemaining
  displayPadding[1] = gCanvas.value!.width - (padding[3] + hRemaining + hGridSize.value * cellCount)
  displayPadding[2] = gCanvas.value!.height - (padding[0] + vRemaining + vGridSize.value * cellCount)
  displayPadding[3] = padding[3] + hRemaining
  clientHeight.value = oCanvas.value!.height - displayPadding[0] - displayPadding[2]
}


const resize = () => {
  windowWidth = window.innerWidth
  setCanvasSize()
}


onMounted(() => {
  window.addEventListener('resize', resize)

  gCtx.value = gCanvas.value!.getContext('2d', { storage: 'persistent' }) as CanvasRenderingContext2D
  oCtx.value = oCanvas.value!.getContext('2d', { storage: 'persistent' }) as CanvasRenderingContext2D

  setCanvasSize()

  setPositions()
  drawGrid(gCtx.value)
  drawPoints(oCtx.value)

  function setPositions() {
    hPositions.length = 0
    hPositions.push(displayPadding[3])
    for (let i = 1; i < cellCount; i++) {
      hPositions.push(i * hGridSize.value + displayPadding[3])
      points.push({
        x: i * hGridSize.value + displayPadding[3],
        y: computed(() => clientHeight.value - mapbox.value.settings.littArray[i - 1] * clientHeight.value + displayPadding[0]),
      })
    }
    hPositions.push(cellCount * hGridSize.value + displayPadding[3])
  }
})
</script>


<template>
  <div class="grid-canvas-container" :class="{'is-mobile': mobileView}">
    <canvas id="grid-canvas" ref="gCanvas"></canvas>
    <canvas id="obj-canvas" ref="oCanvas" @mousedown="mouseDown" @touchstart="touchStart"></canvas>
  </div>
</template>


<style lang="scss" scoped>
  .grid-canvas-container {
    position: relative;
    width: 400px;
    height: 320px;
    margin: .25rem 1rem .75rem;
  }
  .is-mobile {
    max-width: calc(100vw - 20px);
    max-height: calc((100vw - 20px - 2rem) * 0.75 + 20px);
  }
  #grid-canvas,
  #obj-canvas {
    position: absolute;
    top: 0;
    left: 0;
  }
  #grid-canvas {
    background-color: rgba(0, 1, 4, 0.3);
  }
</style>
