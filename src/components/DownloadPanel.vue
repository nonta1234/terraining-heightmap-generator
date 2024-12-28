<script setup lang="ts">
import type { OptionItem, Settings, FileType } from '~/types/types'
import { styleList } from '~/utils/const'

const mapbox = useMapbox()
const { debugMode } = useDebug()
const rawButton = ref<HTMLElement>()
const pngButton = ref<HTMLElement>()
const imgButton = ref()
const osmButton = ref<HTMLElement>()

const mapStyleValue = ref('')

const mapStyleList = computed(() => {
  const options: OptionItem[] = Object.values(styleList).map(({ value, label }) => ({ value, label }))
  options.unshift({ type: 'header', label: '--Select Style--' })
  if (mapbox.value.settings.userStyleURL) {
    options.push({ value: 'user', label: 'User Style' })
  }
  if (mapbox.value.settings.accessToken) {
    options.push({ type: 'divide' })
    options.push({ value: 'customize', label: 'Customize Map' })
  }
  return options
})

const getRawHeightmap = async () => {
  rawButton.value?.classList.add('downloading')
  try {
    useEvent('message:reset')
    useEvent('isDownload', true)
    const worker = useWorker()
    const plainSettings: Settings = JSON.parse(JSON.stringify(mapbox.value.settings))
    if (mapbox.value.settings.gridInfo === 'cs2') {
      const { heightmap, worldMap } = await worker.value?.generateMap(
        'raw',
        plainSettings,
        mapbox.value.settings.resolution,
        false,
      ) as FileType

      download(`heightmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.raw`, heightmap)

      setTimeout(
        () => download(`worldmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.raw`, worldMap),
        200,
      )
    } else {
      const { heightmap } = await worker.value?.generateMap(
        'raw',
        plainSettings,
        mapbox.value.settings.resolution,
        false,
      ) as FileType

      download(`heightmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.raw`, heightmap)
    }
    saveSettings(mapbox.value.settings)
  } catch (e: any) {
    console.log(e.message)
  } finally {
    rawButton.value?.classList.remove('downloading')
    setTimeout(() => useEvent('isDownload', false), 3000)
  }
}

const getPngHeightmap = async () => {
  pngButton.value?.classList.add('downloading')
  try {
    useEvent('message:reset')
    useEvent('isDownload', true)
    const worker = useWorker()
    const plainSettings: Settings = JSON.parse(JSON.stringify(mapbox.value.settings))
    if (mapbox.value.settings.gridInfo === 'cs2') {
      const { heightmap, worldMap } = await worker.value?.generateMap(
        'png',
        plainSettings,
        mapbox.value.settings.resolution,
        false,
      ) as FileType

      download(`heightmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, heightmap)

      setTimeout(
        () => download(`worldmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, worldMap),
        200,
      )
    } else {
      const { heightmap } = await worker.value?.generateMap(
        'png',
        plainSettings,
        mapbox.value.settings.resolution,
        false,
      ) as FileType

      download(`heightmap_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, heightmap)
    }
    saveSettings(mapbox.value.settings)
  } catch (e: any) {
    console.log(e.message)
  } finally {
    pngButton.value?.classList.remove('downloading')
    setTimeout(() => useEvent('isDownload', false), 3000)
  }
}

const getMapImageData = async (value: string) => {
  if (value === 'customize') {
    useEvent('map:miModal')
    return
  }
  imgButton.value?.startIconRotation()
  const valueStr = value === 'user'
    ? mapbox.value.settings.userStyleURL?.replace('mapbox://styles/', '')
    : value
  const offset = mapbox.value.settings.gridInfo === 'cs1' ? 0 : 0.375
  try {
    const png = await getMapImage(valueStr!, offset)
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
  <div id="download-panel">
    <ul>
      <li v-if="debugMode">
        <button ref="debugButton" title="debug" class="debug btn" @click="debug">
          <DebugIcon />
        </button></li>
      <li>
        <button ref="rawButton" title="Download RAW height map" class="dl-icon btn" @click="getRawHeightmap">
          <RawIcon />
        </button></li>
      <li>
        <button ref="pngButton" title="Download PNG height map" class="dl-icon btn" @click="getPngHeightmap">
          <PngIcon />
        </button></li>
      <li>
        <SelectMenu ref="imgButton" v-model="mapStyleValue" class="dl-image" :always-reset="true" :options="mapStyleList" :gap="13" title="Download map image" @change="getMapImageData">
          <template #icon>
            <ImgIcon />
          </template>
        </SelectMenu>
      </li>
      <li>
        <button ref="osmButton" title="Download OSM data" class="osm btn" @click="getOsmData">
          <OsmLogo />
        </button></li>
      <li>
        <button
          title="https://github.com/nonta1234/terraining-heightmap-generator"
          class="btn"
          @click="toRepository"
        >
          <font-awesome-icon :icon="['far', 'circle-question']" class="fa-fw fa-2xl" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
#download-panel {
  position: absolute;
  top: 10px;
  right: 10px;
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
    padding: .375rem .5rem;
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

    &:hover,
    &:focus {
      color: aquamarine;
    }

    svg {
      margin: auto;
      fill: currentColor;
    }
  }

  @include tbLayout {
    top: auto;
    right: auto;
    bottom: 10px;
    left: 10px;
    width: calc(100vw - 20px);
  }
}

.dl-image {
  width: 40px;
  height: 40px;
}

.dl-icon, :deep(.select-menu-icon) {
  svg {
    width: 28px;
    height: 30px;
  }
}

:deep(.select-menu-icon) {
  padding: 5px 6px;
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

.btn {
  cursor: pointer;
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
