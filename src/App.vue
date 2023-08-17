<script setup lang="ts">
const visibillity = ref(false)

useListen('map:modal', () => {
  visibillity.value = !visibillity.value
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
      <ControlPanel />
      <LittoralEditor v-show="visibillity" />
    </MapBox>
    <canvas v-show="debugMode" id="tile-canvas"></canvas>
    <canvas v-show="debugMode" id="water-map-canvas"></canvas>
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
    bottom: 300px;
    right: 60px;
    width: 250px;
    height: 250px;
    z-index: 5;
    background-color: white;
    @include shadow-panel;
  }
  #water-map-canvas {
    position: absolute;
    bottom: 30px;
    right: 60px;
    width: 250px;
    height: 250px;
    z-index: 10;
    background-color: white;
    @include shadow-panel;
  }
</style>
