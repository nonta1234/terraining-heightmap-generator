<script setup lang="ts">
import init, { encode_16g } from '~~/png_lib/pkg'  // eslint-disable-line
const mapbox = useMapbox()
const device = useDevice()

const rawButton = ref<HTMLElement>()
const pngButton = ref<HTMLElement>()
const imgButton = ref()
const osmButton = ref<HTMLElement>()

const { debugMode } = useDebug()

const getRawHeightmap = async () => {
  rawButton.value?.classList.add('downloading')
  try {
    if (mapbox.value.settings.gridInfo === 'cs1') {
      const { heightmap } = await getCitiesMap('cs1')
      download(`heightmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.raw`, heightmap)
    } else {
      const { heightmap, worldMap } = await getCitiesMap('cs2')
      download(`heightmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.raw`, heightmap)
      setTimeout(
        () => download(`worldmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.raw`, worldMap),
        200,
      )
    }
    saveSettings(mapbox.value.settings)
  } catch (e: any) {
    console.log(e.message)
  } finally {
    rawButton.value?.classList.remove('downloading')
  }
}


const getPngHeightmap = async () => {
  pngButton.value?.classList.add('downloading')
  try {
    if (mapbox.value.settings.gridInfo === 'cs1') {
      const { heightmap } = await getCitiesMap('cs1')
      await init()
      const png = await encode_16g({
        width: mapSpec[mapbox.value.settings.gridInfo].mapPixels,
        height: mapSpec[mapbox.value.settings.gridInfo].mapPixels,
        data: heightmap,
      })
      download(`heightmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, png.data)
    } else {
      const { heightmap, worldMap } = await getCitiesMap('cs2')
      await init()
      const heightmapPng = await encode_16g({
        width: mapSpec[mapbox.value.settings.gridInfo].mapPixels,
        height: mapSpec[mapbox.value.settings.gridInfo].mapPixels,
        data: heightmap,
      })
      await init()
      const worldMapPng = await encode_16g({
        width: mapSpec[mapbox.value.settings.gridInfo].mapPixels,
        height: mapSpec[mapbox.value.settings.gridInfo].mapPixels,
        data: worldMap!,
      })
      download(`heightmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, heightmapPng.data)
      setTimeout(
        () => download(`worldmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, worldMapPng.data),
        200,
      )
    }
    saveSettings(mapbox.value.settings)
  } catch (e: any) {
    console.log(e.message)
  } finally {
    pngButton.value?.classList.remove('downloading')
  }
}


const getMapImageData = async (e: Event) => {
  const value = (e.target as HTMLSelectElement).value
  if (value === 'customize') {
    useEvent('map:miModal')
    return
  }
  imgButton.value?.startIconRotation()
  const valueStr = value === 'user'
    ? mapbox.value.settings.userStyleURL.replace('mapbox://styles/', '')
    : value
  const offset = mapbox.value.settings.gridInfo === 'cs1' ? 0 : 0.375
  try {
    const png = await getMapImage(valueStr, offset)
    download(`map-image_${valueStr}_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, png)
    saveSettings(mapbox.value.settings)
  } catch (e) {
    console.error(e)
  } finally {
    imgButton.value?.stopIconRotation()
  }
}


const getOsmData = async () => {
  osmButton.value?.classList.add('downloading')
  try {
    const osmMap = await getOsmMap()
    download(`osm-data_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.osm`, osmMap)
    saveSettings(mapbox.value.settings)
  } catch (e: any) {
    console.log(e.message)
  } finally {
    osmButton.value?.classList.remove('downloading')
  }
}


const cpModal = () => {
  useEvent('map:cpModal')
}


const toRepository = () => {
  window.open('https://github.com/nonta1234/terraining-heightmap-generator', '_blank')
}


function download(filename: string, data: any) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  console.log(`download completed: ${filename}`)
}


const debug = () => {
  useEvent('debug:operate')
}
</script>


<template>
  <div id="download-panel" :class="{'is-mobile': device.isMobile, 'is-desktop': !device.isMobile}">
    <ul>
      <li v-if="debugMode"><button ref="debugButton" title="debug" class="debug" @click="debug"><DebugIcon /></button></li>
      <li><button ref="rawButton" title="Download RAW height map" class="dl-icon" @click="getRawHeightmap"><RawIcon /></button></li>
      <li><button ref="pngButton" title="Download PNG height map" class="dl-icon" @click="getPngHeightmap"><PngIcon /></button></li>
      <li>
        <SelectButton
          ref="imgButton"
          :list="styleList"
          title="Download map image"
          @change="getMapImageData"
        >
          <ImgIcon />
        </SelectButton>
      </li>
      <li><button ref="osmButton" title="Download OSM data" class="osm" @click="getOsmData"><OsmLogo /></button></li>
      <li><button title="Configuration" @click="cpModal"><font-awesome-icon :icon="['fas', 'gear']" class="fa-fw fa-2xl" /></button></li>
      <li><button title="https://github.com/nonta1234/terraining-heightmap-generator" @click="toRepository"><font-awesome-icon :icon="['far', 'circle-question']" class="fa-fw fa-2xl" /></button></li>
    </ul>
  </div>
</template>


<style lang="scss" scoped>
  #download-panel {
    position: absolute;
    border-radius: .375rem;
    color: $textColor;
    font-size: 1rem;
    z-index: 2;
    user-select: none;
    @include grass;
    ul {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: .5rem;
    }
    li {
      position: relative;
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
        fill: currentColor;
      }
    }
  }
  .dl-icon {
    svg {
      width: 28px;
      height: 30px;
    }
  }
  .is-mobile {
    bottom: 2.25rem;
    right: 10px;
    width: calc(100vw - 20px);
  }
  .is-desktop {
    top: 10px;
    right: 10px;
  }
  .osm {
    padding: 3.969px 4px 3px 3px;
    svg {
      height: 100%;
    }
  }
  .debug {
    padding: 2px 0;
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
      transform: rotateY(-1turn);
    }
  }
  :deep(.select-button) {
    .is-active {
      color: aquamarine;
    }
    svg {
      fill: currentColor;
      padding: 1px 2px;
      width: 32px;
      height: 32px;
    }
  }
</style>
