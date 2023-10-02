<script setup lang="ts">
const littEditVisi = ref(false)
const configPanelVisi = ref(false)

useListen('map:leModal', () => {
  littEditVisi.value = !littEditVisi.value
})

useListen('map:cpModal', () => {
  configPanelVisi.value = !configPanelVisi.value
})

const { debugMode, updateDebugMode } = useDebug()
const mode = String(useRoute().query.debug || 'false')
updateDebugMode(parseBoolean(mode))

function parseBoolean(str: string): boolean {
  const lowercaseStr = str.toLowerCase()
  return lowercaseStr === 'true'
}
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
    bottom: 40px;
    right: 80px;
    width: 250px;
    height: 250px;
    z-index: 5;
    background-color: white;
    @include shadow-panel;
  }
</style>
