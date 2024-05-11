<script setup lang="ts">
import type { Canvases } from '~/types/types'

const littEditVisi = ref(false)
const configPanelVisi = ref(false)

const tileCanvasRef = ref<HTMLCanvasElement>()
const waterCanvasRef = ref<HTMLCanvasElement>()
const waterWayCanvasRef = ref<HTMLCanvasElement>()
const littCanvasRef = ref<HTMLCanvasElement>()
const cornerCanvasRef = ref<HTMLCanvasElement>()

useListen('map:leModal', (value) => {
  if (value === undefined) {
    littEditVisi.value = !littEditVisi.value
  } else {
    littEditVisi.value = value
  }
})

useListen('map:cpModal', (value) => {
  if (value === undefined) {
    configPanelVisi.value = !configPanelVisi.value
  } else {
    configPanelVisi.value = value
  }
})

const { debugMode, updateDebugMode } = useDebug()
const mode = String(useRoute().query.debug || 'false')
updateDebugMode(parseBoolean(mode))

function parseBoolean(str: string): boolean {
  const lowercaseStr = str.toLowerCase()
  return lowercaseStr === 'true'
}

onMounted(() => {
  const osTileCanvas = tileCanvasRef.value!.transferControlToOffscreen()
  const osWaterCanvas = waterCanvasRef.value!.transferControlToOffscreen()
  const osWaterWayCanvas = waterWayCanvasRef.value!.transferControlToOffscreen()
  const osLittCanvas = littCanvasRef.value!.transferControlToOffscreen()
  const osCornerCanvas = cornerCanvasRef.value!.transferControlToOffscreen()
  useState('canvases', () => {
    return {
      osTileCanvas,
      osWaterCanvas,
      osWaterWayCanvas,
      osLittCanvas,
      osCornerCanvas,
    } as Canvases
  })
})
</script>


<template>
  <div id="map-container">
    <MapBox>
      <SettingPanel />
      <DownloadPanel />
      <LittoralEditor v-show="littEditVisi" :modal="false" />
      <ConfigurationPanel v-show="configPanelVisi" :modal="true" />
    </MapBox>
    <canvas v-show="debugMode" id="tile-canvas" ref="tileCanvasRef" class="debug-canvas"></canvas>
    <div v-show="debugMode" class="water-canvas-container">
      <canvas v-show="debugMode" id="water-canvas" ref="waterCanvasRef"></canvas>
      <canvas v-show="debugMode" id="waterway-canvas" ref="waterWayCanvasRef"></canvas>
    </div>
    <canvas v-show="debugMode" id="litt-canvas" ref="littCanvasRef" class="debug-canvas"></canvas>
    <canvas v-show="debugMode" id="corner-canvas" ref="cornerCanvasRef" class="debug-canvas"></canvas>
  </div>
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
    @include shadow-panel;
  }
  .debug-canvas {
    position: absolute;
    width: 300px;
    height: 300px;
    z-index: 5;
    background-color: black;
    @include shadow-panel;
  }
</style>
