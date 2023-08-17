<script setup lang="ts">
import init, { encode_16g } from '~~/png_lib/pkg'  // eslint-disable-line

const mapbox = useMapbox()
const config = useRuntimeConfig()
const { isMobile } = useDevice()

const isShowEffectedArea = ref(false)

const pngButton = ref<HTMLElement>()
const imgButton = ref<HTMLElement>()
const osmButton = ref<HTMLElement>()

const { debugMode } = useDebug()


const getPngHeightMap = async () => {
  pngButton.value?.classList.add('downloading')
  try {
    await init()
    const citiesMap = await getCitiesMap()
    const png = await encode_16g({ width: mapSizePixels, height: mapSizePixels, data: new Uint8Array(citiesMap) })
    download(`heightmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, png.data)
    saveSettings(mapbox.value.settings)
  } catch (e: any) {
    console.log(e.message)
  } finally {
    pngButton.value?.classList.remove('downloading')
  }
}


const getMapImage = async () => {
  imgButton.value?.classList.add('downloading')
  const { minLng, minLat, maxLng, maxLat } = getBoundsLngLat()

  const url = 'https://api.mapbox.com/styles/v1/mapbox/' +
              'outdoors-v12/static/[' +
              minLng + ',' +
              minLat + ',' +
              maxLng + ',' +
              maxLat + ']/1080x1080@2x?access_token=' +
              config.public.token

  try {
    const res = await fetch(url)
    if (res.ok) {
      const png = await res.blob()
      download(`map_image_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, png)
      saveSettings(mapbox.value.settings)
    } else {
      throw new Error(`download map image error: ${res.status}`)
    }
  } catch (e: any) {
    console.log(e.message)
  } finally {
    imgButton.value?.classList.remove('downloading')
  }
}


const getOsmData = async () => {
  osmButton.value?.classList.add('downloading')
  const { minLng, minLat, maxLng, maxLat } = getBoundsLngLat()

  const url = 'https://overpass-api.de/api/map?bbox=' +
              minLng + ',' +
              minLat + ',' +
              maxLng + ',' +
              maxLat

  try {
    const res = await fetch(url)
    if (res.ok) {
      const osm = await res.blob()
      download(`map_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.osm`, osm)
      saveSettings(mapbox.value.settings)
    } else {
      throw new Error(`download osm map error: ${res.status}`)
    }
  } catch (e: any) {
    console.log(e.message)
  } finally {
    osmButton.value?.classList.remove('downloading')
  }
}


const toggleEffectedArea = () => {
  isShowEffectedArea.value = !isShowEffectedArea.value
  if (isShowEffectedArea.value) {
    mapbox.value.map?.setLayoutProperty('sharpenLayer', 'visibility', 'visible')
    mapbox.value.map?.setLayoutProperty('smoothLayer', 'visibility', 'visible')
    mapbox.value.map?.setLayoutProperty('hillshading', 'visibility', 'visible')
  } else {
    mapbox.value.map?.setLayoutProperty('sharpenLayer', 'visibility', 'none')
    mapbox.value.map?.setLayoutProperty('smoothLayer', 'visibility', 'none')
    mapbox.value.map?.setLayoutProperty('hillshading', 'visibility', 'none')
  }
}


const panTo = () => {
  mapbox.value.map?.panTo([mapbox.value.settings.lng, mapbox.value.settings.lat])
  saveSettings(mapbox.value.settings)
}


function getBoundsLngLat() {
  const bounds = getExtent(mapbox.value.settings.lng, mapbox.value.settings.lat, mapbox.value.settings.size / 2, mapbox.value.settings.size / 2)
  const minLng = Math.min(bounds.topleft[0], bounds.bottomright[0])
  const minLat = Math.min(bounds.topleft[1], bounds.bottomright[1])
  const maxLng = Math.max(bounds.topleft[0], bounds.bottomright[0])
  const maxLat = Math.max(bounds.topleft[1], bounds.bottomright[1])

  return { minLng, minLat, maxLng, maxLat }
}


function download(filename: string, data: any, url = '') {
  const a = document.createElement('a')

  if (url) {
    a.href = url
  } else {
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }))
  }
  a.download = filename

  document.body.appendChild(a)
  a.click()

  document.body.removeChild(a)
}


const debug = () => {
  useEvent('debug:operate')
}
</script>


<template>
  <div id="control-panel" :class="{'is-mobile': isMobile, 'is-desktop': !isMobile}">
    <ul>
      <li v-if="debugMode"><button ref="debugButton" title="debug" class="debug" @click="debug"><DebugIcon /></button></li>
      <li><button ref="pngButton" title="Download PNG height map" @click="getPngHeightMap"><font-awesome-icon :icon="['fas', 'file-arrow-down']" class="fa-fw fa-2xl" /></button></li>
      <li><button ref="imgButton" title="Download map image" @click="getMapImage"><font-awesome-icon :icon="['fas', 'file-image']" class="fa-fw fa-2xl" /></button></li>
      <li><button ref="osmButton" title="Download OSM data" class="osm" @click="getOsmData"><OsmLogo /></button></li>
      <li><button title="Show the smooth & sharpen area" class="pt1" :class="{'no-sharpen-area': !isShowEffectedArea}" @click="toggleEffectedArea"><font-awesome-icon :icon="['fas', 'mountain-sun']" class="fa-fw fs28" /></button></li>
      <li><button title="To the grid point" class="pt2" @click="panTo"><font-awesome-icon :icon="['fas', 'house']" class="fa-fw fs28" /></button></li>
    </ul>
  </div>
</template>


<style lang="scss" scoped>
  #control-panel {
    position: absolute;
    border-radius: .375rem;
    color: $textColor;
    font-size: 1rem;
    z-index: 2;
    user-select: none;
    @include grass;
  }
  .is-mobile {
    bottom: 2.25rem;
    left: 10px;
    width: calc(100vw - 20px);
  }
  .is-desktop {
    top: 10px;
    right: 10px;
  }
  ul {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: .5rem;
  }
  li {
    flex-shrink: 0;
    height: 48px;
    width: 56px;
    padding: 4px 8px;
  }
  button {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    display: block;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    background-color: transparent;
    color: $textColor;
    perspective: 100px;
    text-align: center;
    &:hover, &:focus {
      color: aquamarine;
    }
    svg {
      margin: auto;
    }
  }
  .osm {
    padding: 3.969px 4px 3px 3px;
    svg {
      height: 100%;
    }
  }
  .debug {
    padding: 2px 0 2px;
    svg {
      height: 100%;
    }
  }
  .downloading {
    svg {
      animation: rotateY 2s linear infinite;
    }
  }
  @keyframes rotateY {
    to {
      transform:rotateY(-1turn);
    }
  }
  .no-sharpen-area {
    color: $textDisabled;
  }
  .fs28 {
    font-size: 1.75rem;
  }
  .pt1 {
    padding-top: 1px;
  }
  .pt2 {
    padding-top: 2px;
  }
</style>
