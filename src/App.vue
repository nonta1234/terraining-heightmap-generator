<script setup lang="ts">
import type { Canvases } from '~/types/types'

const isReloading = ref(false)
const cMapImagePanelVisi = ref(false)
const tileCanvasRef = ref<HTMLCanvasElement>()
const waterCanvasRef = ref<HTMLCanvasElement>()
const waterWayCanvasRef = ref<HTMLCanvasElement>()
const littCanvasRef = ref<HTMLCanvasElement>()
const cornerCanvasRef = ref<HTMLCanvasElement>()

useListen('map:miModal', (value) => {
  if (value === undefined) {
    cMapImagePanelVisi.value = !cMapImagePanelVisi.value
  }
  else {
    cMapImagePanelVisi.value = value
  }
})

// debug
const { debugMode, updateDebugMode } = useDebug()
const mode = String(useRoute().query.debug || 'false')
updateDebugMode(mode)

const { updateViewMode } = useViewMode()
const vMode = String(useRoute().query.view || 'world')
updateViewMode(vMode)

onMounted(async () => {
  const osTileCanvas = tileCanvasRef.value!.transferControlToOffscreen()
  const osWaterCanvas = waterCanvasRef.value!.transferControlToOffscreen()
  const osWaterWayCanvas = waterWayCanvasRef.value!.transferControlToOffscreen()
  const osLittCanvas = littCanvasRef.value!.transferControlToOffscreen()
  const osCornerCanvas = cornerCanvasRef.value!.transferControlToOffscreen()

  useState<Canvases>('canvases', () => {
    return {
      osTileCanvas,
      osWaterCanvas,
      osWaterWayCanvas,
      osLittCanvas,
      osCornerCanvas,
    }
  })

  await initializeWorker()

  const { build, accessTokenMT } = useMapbox().value.settings
  if (build < BUILD_NUMBER) alert('Please reset the parameters once.')
  if (!accessTokenMT) alert('Version 2 now requires a MapTiler API key.')
})

useListen('map:reload', () => {
  isReloading.value = true
  setTimeout(() => {
    reloadNuxtApp()
  }, 400)
})
</script>

<template>
  <div id="map-container">
    <MapBox>
      <InfoPanel />
      <DownloadPanel />
      <CustomizeMapImagePanel v-show="cMapImagePanelVisi" :modal="true" />
    </MapBox>
    <canvas v-show="debugMode" id="tile-canvas" ref="tileCanvasRef" class="debug-canvas"></canvas>
    <div v-show="debugMode" class="water-canvas-container">
      <canvas v-show="debugMode" id="water-canvas" ref="waterCanvasRef"></canvas>
      <canvas v-show="debugMode" id="waterway-canvas" ref="waterWayCanvasRef"></canvas>
    </div>
    <canvas v-show="debugMode" id="litt-canvas" ref="littCanvasRef" class="debug-canvas"></canvas>
    <canvas v-show="debugMode" id="corner-canvas" ref="cornerCanvasRef" class="debug-canvas"></canvas>
  </div>
  <transition name="fade">
    <div v-if="isReloading" class="full-screen-black-box"></div>
  </transition>
</template>

<style lang="scss" scoped>
#map-container {
  position: relative;
  height: 100dvh;
  overflow: hidden;
}

#tile-canvas {
  bottom: 352px;
  right: 386px;
}

#water-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 300px;
  height: 300px;
  background-color: black;
  z-index: 10;
}

#waterway-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 300px;
  height: 300px;
  background-color: black;
  z-index: 15;
  mix-blend-mode: darken;
  pointer-events: none;
}

#litt-canvas {
  bottom: 36px;
  right: 386px;
}

#corner-canvas {
  bottom: 36px;
  right: 70px;
}

.water-canvas-container {
  position: absolute;
  bottom: 352px;
  right: 70px;
  width: 300px;
  height: 300px;
  z-index: 5;
  @include shadow-2;
}

.debug-canvas {
  position: absolute;
  width: 300px;
  height: 300px;
  z-index: 5;
  background-color: black;
  @include shadow-2;
}

.full-screen-black-box {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: black;
  z-index: 9999;
}

.fade-enter-active, .fade-leave-active {
  transition: all .3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
