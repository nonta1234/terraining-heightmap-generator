<script setup lang="ts">
const mapbox = useMapbox()

const heightmapTypeRef = ref<HTMLSelectElement>()
const interpolationRef = ref<HTMLSelectElement>()

onMounted(() => {
  heightmapTypeRef.value!.value = mapbox.value.settings.gridInfo
  interpolationRef.value!.value = mapbox.value.settings.interpolation
})

const close = () => {
  useEvent('map:cpModal')
  setLngLat(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
}
</script>


<template>
  <ModalWindow>
    <div id="config-panel">
      <header>Configuration</header>
      <div class="main">
        <label class="select">
          Heightmap Type&ThinSpace;:
          <select ref="heightmapTypeRef" v-model="mapbox.settings.gridInfo" name="heightmapType">
            <option value="cs1">Cities: Skylines</option>
            <!--<option value="cs2">Cities: Skylines II</option>-->
          </select>
        </label>
        <label class="select">
          Interpolation&ThinSpace;:
          <select ref="interpolationRef" v-model="mapbox.settings.interpolation" name="interpolation">
            <option value="bilinear">Bilinear</option>
            <option value="bicubic">Bicubic</option>
          </select>
        </label>
        <button class="close" @click="close">CLOSE</button>
      </div>
    </div>
  </ModalWindow>
</template>


<style lang="scss" scoped>
  header {
    font-size: 1rem;
    text-align: center;
    font-weight: 700;
    padding: .5rem 0 .75rem;
    line-height: 1;
  }
  .main {
    padding: 0 1rem 1rem;
  }
  button, select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    display: block;
    flex-shrink: 0;
  }
  .close {
    height: 2.25rem;
    border-radius: .25rem;
    padding: 0 1rem 0;
    font-size: 1rem;
    line-height: 2.125;
    text-align: center;
    border: solid 1px $borderColor;
    background-color: rgba(255, 255, 255, .1);
    color: $textColor;
    margin: 1.5rem 0 0 auto;
    cursor: pointer;
    &:hover, &:focus {
      color: aquamarine;
      background-color: rgba(0, 206, 209, .35);
    }
  }
  select {
    width: 10.5rem;
    border-radius: .25rem;
    color: $textColor;
    padding-left: .5rem;
    height: 2.25rem;
    line-height: 2.25;
    background-color: $inputBg;
    font-size: 1rem;
    cursor: pointer;
    &:active, &:focus {
      background-color: $inputBgF;
    }
  }
  .select {
    width: 20rem;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    &::after {
      position: absolute;
      right: .5rem;
      width: .625rem;
      height: .4375rem;
      background-color: $textAlt;
      clip-path: polygon(0 0, 100% 0, 50% 100%);
      content: '';
      pointer-events: none;
    }
  }
</style>
