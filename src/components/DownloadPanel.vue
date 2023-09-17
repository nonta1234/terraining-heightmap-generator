<script setup lang="ts">
import init, { encode_16g } from '~~/png_lib/pkg'  // eslint-disable-line

const mapbox = useMapbox()
const config = useRuntimeConfig()
const { isMobile } = useDevice()

const pngButton = ref<HTMLElement>()
const imgButton = ref()
const osmButton = ref<HTMLElement>()

const { debugMode } = useDebug()

const getPngHeightMap = async () => {
  pngButton.value?.classList.add('downloading')
  try {
    await init()
    const citiesMap = await getCitiesMap()
    const png = await encode_16g({
      width: mapSpec[mapbox.value.settings.gridInfo].mapPixels,
      height: mapSpec[mapbox.value.settings.gridInfo].mapPixels,
      data: new Uint8Array(citiesMap),
    })
    download(`heightmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, png.data)
    saveSettings(mapbox.value.settings)
  } catch (e: any) {
    console.log(e.message)
  } finally {
    pngButton.value?.classList.remove('downloading')
  }
}


const getMapImage = async (e: Event) => {
  const value = (e.target as HTMLSelectElement).value
  imgButton.value?.startIconRotation()
  let url = ''

  if (mapbox.value.settings.angle === 0) {
    const { minLng, minLat, maxLng, maxLat } = getBoundsLngLat()
    url = 'https://api.mapbox.com/styles/v1/mapbox/' +
          `${value}/static/[${minLng},${minLat},${maxLng},${maxLat}` +
          `]/1080x1080@2x?access_token=${config.public.token}`
  } else {
    let decimals = 1
    let zoom = 0
    let pixel = 0
    const startIndex = Math.min((mapSpec[mapbox.value.settings.gridInfo].mapPixels - 1) / 2, 1280)

    for (let i = startIndex; i < 1281; i++) {
      const calcZoom = calculateZoomLevel(
        mapbox.value.settings.lat,
        mapbox.value.settings.size,
        i,
        512,
      )
      const z = calcZoom - Math.floor(calcZoom)
      if (z < decimals) {
        zoom = calcZoom
        decimals = z
        pixel = i
      }
    }

    const roundedZoom = Math.round(zoom * 100) / 100
    const bearing = (mapbox.value.settings.angle > 0) ? mapbox.value.settings.angle : mapbox.value.settings.angle + 360

    url = 'https://api.mapbox.com/styles/v1/mapbox/' +
          `${value}/static/` +
          `${mapbox.value.settings.lng},${mapbox.value.settings.lat},${roundedZoom},${bearing}` +
          `/${pixel}x${pixel}@2x?access_token=${config.public.token}`
  }

  try {
    const res = await fetch(url)
    if (res.ok) {
      const png = await res.blob()
      download(`map_image_${value}_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, png)
      saveSettings(mapbox.value.settings)
    } else {
      throw new Error(`download map image error: ${res.status}`)
    }
  } catch (e: any) {
    console.log(e.message)
  } finally {
    imgButton.value?.stopIconRotation()
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


const modal = () => {
  useEvent('map:cpModal')
}


const toRepository = () => {
  window.open('https://github.com/nonta1234/terraining-heightmap-generator', '_blank')
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
  <div id="download-panel" :class="{'is-mobile': isMobile, 'is-desktop': !isMobile}">
    <ul>
      <li v-if="debugMode"><button ref="debugButton" title="debug" class="debug" @click="debug"><DebugIcon /></button></li>
      <li><button ref="pngButton" title="Download PNG height map" @click="getPngHeightMap"><font-awesome-icon :icon="['fas', 'file-arrow-down']" class="fa-fw fa-2xl" /></button></li>
      <li>
        <SelectButton
          ref="imgButton"
          :list="styleList"
          :icon="['fas', 'file-image']"
          :icon-class="'fa-fw fa-2xl'"
          title="Download map image"
          @change="getMapImage"
        />
      </li>
      <li><button ref="osmButton" title="Download OSM data" class="osm" @click="getOsmData"><OsmLogo /></button></li>
      <li><button title="Configuration" @click="modal"><font-awesome-icon :icon="['fas', 'gear']" class="fa-fw fa-2xl" /></button></li>
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
      }
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
      transform: rotateY(-1turn);
    }
  }
  :deep(.select-button) {
    .is-active {
      color: aquamarine;
    }
  }
</style>
