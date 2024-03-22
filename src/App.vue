<script setup lang="ts">
import { Application, WebGLRenderer, TextureStyle } from 'pixi.js'

const littEditVisi = ref(false)
const configPanelVisi = ref(false)
const waterCanvasRef = ref<HTMLCanvasElement>()

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

onMounted(async () => {
  const app = useState<Application<WebGLRenderer<HTMLCanvasElement>>>('pixi-app', () => {
    return new Application<WebGLRenderer<HTMLCanvasElement>>()
  })
  await app.value.init({
    preference: 'webgl',
    antialias: true,
    preserveDrawingBuffer: true,
    backgroundColor: 0x000000,
    useBackBuffer: true,
    resolution: 1,
    preferWebGLVersion: 2,
  })
  const attr = document.createAttribute('id')
  attr.value = 'water-canvas'
  app.value.canvas.setAttributeNode(attr)
  document.body.appendChild(app.value.canvas)
  TextureStyle.defaultOptions.scaleMode = 'linear'
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
    <canvas v-show="debugMode" id="tile-canvas"></canvas>
    <canvas v-show="debugMode" id="litt-canvas"></canvas>
    <!--<canvas v-show="debugMode" id="water-canvas" ref="waterCanvasRef"></canvas>-->
  </div>
</template>


<style lang="scss" scoped>
  #map-container {
    position: relative;
    height: 100dvh;
    overflow: hidden;
  }
  #tile-canvas {
    position: absolute;
    bottom: 596px;
    right: 360px;
    width: 250px;
    height: 250px;
    z-index: 5;
    background-color: black;
    @include shadow-panel;
  }
  #litt-canvas {
    position: absolute;
    bottom: 596px;
    right: 80px;
    width: 250px;
    height: 250px;
    z-index: 5;
    background-color: black;
    @include shadow-panel;
  }
  #water-canvas {
    position: absolute;
    bottom: 36px;
    right: 80px;
    width: 530px;
    height: 530px;
    z-index: 5;
    background-color: black;
    @include shadow-panel;
  }
</style>
