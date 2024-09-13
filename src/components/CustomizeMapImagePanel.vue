<script setup lang="ts">
import { styleList } from '~/utils/const'
import type { OptionItem } from '~/types/types'

const mapbox = useMapbox()
const dlButton = ref<HTMLElement>()
const style = ref('')
const zoomType = ref('auto')
const zoom = ref(13)
const zoomDisabled = ref(true)
const zoomTextHidden = ref(true)
const sizeType = ref('auto')
const size = ref(4096)
const sizeDisabled = ref(true)
const sizeTextHidden = ref(true)
const fullArea = ref(false)
const flag = computed(() => (Number(zoomType.value === 'auto') << 1) | Number(sizeType.value === 'auto'))
const offset = computed(() => (mapbox.value.settings.gridInfo === 'cs1' || fullArea.value) ? 0 : 0.375)
const requests = ref(1)
const caution = computed(() => requests.value > 1000)

const mapStyleList = computed(() => {
  const options: OptionItem[] = Object.values(styleList).map(({ value, label }) => ({ value, label }))
  if (mapbox.value.settings.userStyleURL) {
    options.push({ value: mapbox.value.settings.userStyleURL, label: 'User Style' })
  }
  return options
})

watch(flag, () => {
  zoomDisabled.value = zoomType.value === 'auto'
  sizeDisabled.value = sizeType.value === 'auto'
  if (flag.value === 3) {
    zoomTextHidden.value = true
    sizeTextHidden.value = true
  } else {
    zoomTextHidden.value = false
    sizeTextHidden.value = false
  }
  update()
})

const getZoom = (size: number) => {
  const { x0, x1 } = getExtentInWorldCoords(
    mapbox.value.settings.lng,
    mapbox.value.settings.lat,
    mapbox.value.settings.size,
    offset.value,
    512,
  )
  const side = x1 - x0
  const zoom = Math.round(Math.log2(size / side) * 100) / 100
  const zx0 = x0 * (2 ** zoom)
  const zx1 = x1 * (2 ** zoom)
  const _side = zx1 - zx0
  const cells = Math.ceil(_side / 2000) ** 2
  return { calcZoom: zoom, cells }
}

const getSize = (zoom: number) => {
  const { x0, x1 } = getExtentInWorldCoords(
    mapbox.value.settings.lng,
    mapbox.value.settings.lat,
    mapbox.value.settings.size,
    offset.value,
    512,
  )
  const zx0 = x0 * (2 ** zoom)
  const zx1 = x1 * (2 ** zoom)
  const side = zx1 - zx0
  const cells = Math.ceil(side / 2000) ** 2
  return { calcSize: Math.max(Math.min(16384, Math.round(side)), 1), cells }
}

const update = () => {
  switch (flag.value) {
    case 0: {
      const { cells } = getSize(zoom.value)
      requests.value = cells
      break
    }
    case 1: {
      const { calcSize, cells } = getSize(zoom.value)
      size.value = calcSize
      requests.value = cells
      break
    }
    case 2: {
      const { calcZoom, cells } = getZoom(size.value)
      zoom.value = calcZoom
      requests.value = cells
      break
    }
    case 3: {
      requests.value = 1
      break
    }
  }
}

useListen('map:miModal', (value) => {
  if (value === undefined) {
    style.value = ''
    update()
  }
})

const close = () => {
  useEvent('map:miModal', false)
}

function downloadData(filename: string, data: any) {
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

/**
 * 0. zoom: custom, size: custom\
 *    Normally use getCustomMapImage.\
 *    However, if it exceeds 16384px, it will be reduced to 16384px.
 * 1. zoom: custom, size: auto\
 *    Set within 16384px.
 * 2. zoom: auto, size: custom\
 *    Set zoom using log2.
 * 3. zoom: auto, size: auto\
 *    Use getMapImage.
 */
const download = async () => {
  if (!style.value) {
    return
  }
  dlButton.value?.classList.add('downloading')
  const valueStr = style.value === 'user'
    ? mapbox.value.settings.userStyleURL?.replace('mapbox://styles/', '')
    : style.value
  try {
    if (flag.value === 1 || flag.value === 2) {
      update()
    }
    const png = flag.value === 3
      ? await getMapImage(valueStr!, offset.value)
      : await getCustomMapImage(valueStr!, zoom.value, offset.value, 16384, size.value)
    downloadData(`map-image_${valueStr}_${mapbox.value.settings.lng}_${mapbox.value.settings.lat}_${mapbox.value.settings.size}.png`, png)
    saveSettings(mapbox.value.settings)
  } catch (e) {
    console.error(e)
  } finally {
    dlButton.value?.classList.remove('downloading')
  }
}
</script>

<template>
  <ModalWindow>
    <div id="customize-map-image-panel">
      <h3>Customize Map Image</h3>
      <CloseButton class="close" @click="close" />
      <div class="main">
        <label for="style">Style&#8202;:</label>
        <SelectMenu id="style" v-model="style" placeholder="Select Style" :options="mapStyleList" />
        <label for="zoom-type">Zoom Type&#8202;:</label>
        <SelectMenu id="zoom-type" v-model="zoomType"
          :options="[
            { value: 'auto', label: 'Auto' },
            { value: 'custom', label: 'Custom' },
          ]"
        />
        <label for="zoom-level">Zoom Level&#8202;:</label>
        <NumberInput
          id="zoom-level"
          v-model="zoom"
          :max="20"
          :min="0"
          :step="0.01"
          :disabled="zoomDisabled"
          :text-hidden="zoomTextHidden"
          @change="update"
        />
        <label for="size-type">Size Type&#8202;:</label>
        <SelectMenu id="size-type" v-model="sizeType"
          :options="[
            { value: 'auto', label: 'Auto' },
            { value: 'custom', label: 'Custom' },
          ]"
        />
        <label for="image-size">Image Size&#8202;:</label>
        <NumberInput
          id="image-size"
          v-model="size"
          :max="16384"
          :min="1"
          :step="1"
          :disabled="sizeDisabled"
          :text-hidden="sizeTextHidden"
          unit="px"
          @change="update"
        />
        <label class="full-area-label" for="full-area">Full Area (CS2)&#8202;:</label>
        <ToggleSwitch v-model="fullArea" class="full-area-toggle" :name="'full-area'" @change="update" />
        <label class="request">API Request Count&#8202;:</label>
        <div class="request-count">
          <div :class="{ 'caution': caution }">{{ requests }}</div>
        </div>
      </div>
      <footer>
        <button ref="dlButton" class="button download" @click="download">
          <DownloadIcon />
          <span>Download</span>
        </button>
      </footer>
    </div>
  </ModalWindow>
</template>

<style lang="scss" scoped>
#customize-map-image-panel {
  position: relative;
}

h3 {
  font-size: 1rem;
  text-align: center;
  font-weight: 700;
  height: 2rem;
  margin-bottom: 1rem;
  line-height: 2;
}

.close {
  position: absolute;
  top: 6px;
  right: 6px;
}

.main {
  padding: 0 1rem;
  display: grid;
  grid-template-columns: auto 7.5rem;
  gap: 1rem 2rem;
  position: relative;
  line-height: 1.875;
}

.full-area-label {
  grid-column: 1 / 3;
  grid-row: 6 / 7;
  z-index: 1;
}

.full-area-toggle {
  grid-column: 2 / 3;
  grid-row: 6 / 7;
  z-index: 2;
}

:deep(.input-wrapper) {
  @include common-input;
}

:deep(.toggle-switch) {
  margin: auto 0 auto auto;
}

.request {
  grid-column: 1 / 3;
  grid-row: 7 / 8;
  z-index: 1;
}

.request-count {
  grid-column: 2 / 3;
  grid-row: 7 / 8;
  z-index: 2;
  padding-right: .25rem;
  text-align: right;
}

.caution {
  color: #FFA500;
}

footer {
  display: flex;
  justify-content: right;
  padding: 1.5rem 1rem 1rem;
}

.button {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  overflow: hidden;
  display: block;
  height: 2rem;
  border-radius: 1rem;
  padding: 0 1rem 0 .625rem;
  font-size: 1rem;
  line-height: 2;
  text-align: center;
  color: $textColor;
  flex-shrink: 0;
}

.download {
  font-weight: 700;
  background-color: rgba(255, 255, 255, .1);
  cursor: pointer;
  display: flex;
  perspective: 100px;
  @include shadow-2;
  &:hover, &:focus {
    color: aquamarine;
    background-color: rgba(0, 206, 209, .35);
    @include shadow-3;
  }
  svg {
    display: inline-block;
    width: 22px;
    height: 22px;
    margin: 4px 6px 6px 0;
  }
  span {
    display: inline-block;
    height: 2rem;
    line-height: 2;
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
</style>
