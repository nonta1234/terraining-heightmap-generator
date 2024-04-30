<script setup lang="ts">
const littEditVisi = ref(false)
const configPanelVisi = ref(false)

const tileCanvasRef = ref<HTMLCanvasElement>()
const waterCanvasRef = ref<HTMLCanvasElement>()
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
  const osLittCanvas = littCanvasRef.value!.transferControlToOffscreen()
  const osCornerCanvas = cornerCanvasRef.value!.transferControlToOffscreen()
  initGetHeightMapWorker(osTileCanvas)
  initGetWaterMapWorker(osWaterCanvas, osLittCanvas, osCornerCanvas)
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
    <canvas v-show="debugMode" id="water-canvas" ref="waterCanvasRef" class="debug-canvas"></canvas>
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
    bottom: 352px;
    right: 70px;
  }
  #litt-canvas {
    bottom: 36px;
    right: 386px;
  }
  #corner-canvas {
    bottom: 36px;
    right: 70px;
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
