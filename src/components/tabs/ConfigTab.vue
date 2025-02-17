<script setup lang="ts">
import { settingsSchema, type Settings } from '~/types/types'
const mapbox = useMapbox()
const device = useDevice()
const visibillity = ref(false)
const visibillityMT = ref(false)
const inputToken = ref<HTMLInputElement>()
const inputTokenMT = ref<HTMLInputElement>()
const fileEl = ref<HTMLInputElement>()

if (device.isMobile) {
  mapbox.value.settings.originalPreview = false
}

const onVisibillityChange = () => {
  visibillity.value = !visibillity.value
  inputToken.value!.type = visibillity.value ? 'text' : 'password'
}

const onVisibillityChangeMT = () => {
  visibillityMT.value = !visibillityMT.value
  inputTokenMT.value!.type = visibillityMT.value ? 'text' : 'password'
}

async function importSettingsFromFile(file: File): Promise<Settings | null> {
  const fileReader = new FileReader()
  const fileContent: string = await new Promise((resolve, reject) => {
    fileReader.onload = () => resolve(fileReader.result as string)
    fileReader.onerror = () => reject(fileReader.error)
    fileReader.readAsText(file)
  })

  try {
    const importedData = JSON.parse(fileContent)
    const parsedSettings = settingsSchema.safeParse(importedData)

    if (parsedSettings.success) {
      const settings: Partial<Settings> = parsedSettings.data
      const currentSettings: Settings = mapbox.value.settings
      settings.userStyleURL = settings.userStyleURL ?? currentSettings.userStyleURL
      settings.accessToken = settings.accessToken ?? currentSettings.accessToken
      settings.accessTokenMT = settings.accessTokenMT ?? currentSettings.accessTokenMT
      return { ...currentSettings, ...settings }
    } else {
      console.error('Validation failed:', parsedSettings.error)
      return null
    }
  } catch (error) {
    console.error('Failed to parse JSON file:', error)
    return null
  }
}

const importFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    try {
      const settings = await importSettingsFromFile(input.files[0])
      if (settings) {
        mapbox.value.settings = structuredClone(settings)
        saveSettings(mapbox.value.settings)
        console.log('Import process completed.')
        useEvent('map:reload')
      } else {
        console.warn('Failed to import settings. Invalid data.')
      }
    } catch (error) {
      console.error('Import process failed:', error)
    }
  } else {
    console.warn('No file selected for import.')
  }
}

const onImport = () => {
  fileEl.value?.click()
  fileEl.value!.value = ''
}

function downloadBlob(filename: string, data: Blob) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const onExport = async () => {
  function exportFilteredMapSettings(excludeKeys: string[]): string {
    const mapSettingsKey = 'map-settings'
    const rawSettings = localStorage.getItem(mapSettingsKey)

    if (!rawSettings) {
      return JSON.stringify({}, null, 2)
    }

    const mapSettings = JSON.parse(rawSettings)
    const filteredSettings = Object.keys(mapSettings)
      .filter(key => !excludeKeys.includes(key))
      .reduce((obj, key) => {
        obj[key] = mapSettings[key]
        return obj
      }, {} as { [key: string]: any })

    return JSON.stringify(filteredSettings, null, 2)
  }

  const json = exportFilteredMapSettings(['userStyleURL', 'accessToken', 'accessTokenMT'])
  const blob: Blob = new Blob([json], { type: 'application/json' })

  try {
    if (device.isFirefox || device.isSafari) {
      downloadBlob('terraining-settings.json', blob)
    } else {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'terraining-settings.json',
        types: [{
          description: 'JSON file',
          accept: { 'application/json': ['.json'] },
        }],
      })
      const writableStream = await handle.createWritable()
      await writableStream.write(blob)
      await writableStream.close()
    }
    console.log('File has been saved.')
  } catch (error) {
    console.error('Failed to save the file:', error)
  }
}

const onReset = () => {
  if (confirm('Are you sure you want to reset?')) {
    const lng = mapbox.value.settings.lng
    const lat = mapbox.value.settings.lat
    const token = mapbox.value.settings.accessToken
    const tokenMT = mapbox.value.settings.accessTokenMT
    const style = mapbox.value.settings.userStyleURL

    const { $resetSettings } = useNuxtApp()
    mapbox.value.settings = $resetSettings()

    mapbox.value.settings.build = BUILD_NUMBER
    mapbox.value.settings.lng = lng
    mapbox.value.settings.lat = lat
    mapbox.value.settings.accessToken = token
    mapbox.value.settings.accessTokenMT = tokenMT
    mapbox.value.settings.userStyleURL = style
    mapbox.value.settings.elevationScale = mapSpec[mapbox.value.settings.gridInfo].defaultEs

    saveSettings(mapbox.value.settings)
    useEvent('map:reload')
  }
}

onMounted(() => {
  if (!isMtTokenValid() && mapbox.value.settings.originalPreview === true) {
    mapbox.value.settings.originalPreview = false
  }
  inputToken.value!.type = visibillity.value ? 'text' : 'password'
  inputTokenMT.value!.type = visibillityMT.value ? 'text' : 'password'
})
</script>

<template>
  <div id="config-tab">
    <div class="checkbox">
      <label class="label" for="original-preview">Preview at original resolution&#8202;:&nbsp;&nbsp;</label>
      <ToggleSwitch v-model="mapbox.settings.originalPreview" :name="'original-preview'" :disabled="device.isMobile" />
    </div>
    <hr>
    <div class="subdivision">
      <h4>Tile Subdivision Option</h4>
      <div class="subdivision-controls">
        <label for="subdivision-preview">Preview&#8202;:</label>
        <ToggleSwitch v-model="mapbox.settings.subdivisionPreview" name="subdivision-preview" class="sd-switch" />
        <label for="subdivision-download">Download&#8202;:</label>
        <ToggleSwitch v-model="mapbox.settings.subdivisionDownload" name="subdivision-download" />
        <label for="subdivision-count">Detail Level&#8202;:</label>
        <SelectMenu id="subdivision-count" v-model="mapbox.settings.subdivisionCount" class="gap"
          :options="[
            { value: 1, label: 'x2' },
            { value: 2, label: 'x4' },
          ]"
        />
        <label for="edge-sensitivity">Mode&#8202;:</label>
        <SelectMenu id="edge-sensitivity" v-model="mapbox.settings.kernelNumber"
          :options="[
            { value: 4, label: 'Soft' },
            { value: 16, label: 'Balanced' },
            { value: 64, label: 'Sharp' },
          ]"
        />
      </div>
    </div>
    <hr>
    <label for="token-mt" class="label">MapTiler API Key <small>(Required)</small>&#8202;:</label>
    <div class="input-wrapper gap2">
      <input id="token-mt" ref="inputTokenMT" v-model="mapbox.settings.accessTokenMT" class="input" />
      <button class="visi-icon" @click="onVisibillityChangeMT">
        <VisibilityOff v-if="visibillityMT" />
        <VisibilityOn v-else />
      </button>
    </div>
    <hr>
    <div class="checkbox gap0">
      <label class="label flexible-line-height" for="use-mapbox">Use mapbox for heightmap source&#8202;:&nbsp;&nbsp;</label>
      <ToggleSwitch v-model="mapbox.settings.useMapbox" :name="'use-mapbox'" />
    </div>
    <label for="token" class="label">Mapbox Access Token <small>(Optional)</small>&#8202;:</label>
    <div class="input-wrapper gap1">
      <input id="token" ref="inputToken" v-model="mapbox.settings.accessToken" class="input" />
      <button class="visi-icon" @click="onVisibillityChange">
        <VisibilityOff v-if="visibillity" />
        <VisibilityOn v-else />
      </button>
    </div>
    <label for="url" class="label">Mapbox User Style URL&#8202;:</label>
    <div class="input-wrapper">
      <input id="url" v-model="mapbox.settings.userStyleURL" class="input" type="text" />
    </div>
    <footer class="footer">
      <button class="reset-button" @click="onReset">Reset</button>
      <div class="io-button-container">
        <input ref="fileEl" class="file" type="file" accept=".json" @change="importFile" />
        <button class="io-button" @click="onImport">Import</button>
        <button class="io-button" @click="onExport">Export</button>
      </div>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.checkbox {
  display: flex;
}

.label {
  display: block;
  line-height: 2;
}

.flexible-line-height {
  @media screen and (max-width: 524px) {
    line-height: 1.25;
    margin: .375rem 0;
  }
}

.input-wrapper {
  display: flex;
  padding: 0 .25rem;
  width: 100%;
  @include common-input;

  .input {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    outline: none;
    overflow: hidden;
    text-overflow: clip;
    flex: 1 1 100%;
    background-color: transparent;
  }
}

.visi-icon {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  background-color: transparent;
  cursor: pointer;
  flex: 0 0 fit-content;

  &:hover,
  &:focus {
    color: aquamarine;
  }
}

.gap0 {
  margin-bottom: .375rem;
}

.gap1 {
  margin-bottom: .75rem;
}

.gap2 {
  margin-bottom: 1.125rem;
}

.required {
  color: $textAlt;
  font-size: .75rem;
  line-height: 2;
}

:deep(.toggle-switch) {
  margin: auto 0 auto auto;
}

hr {
  background-color: $borderColor;
  height: 2px;
  border: none;
  margin: .75rem 0;
}

.footer {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
}

.reset-button {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  outline: none;
  height: 2em;
  padding: 0 1rem;
  line-height: 1.875;
  border-radius: 1rem;
  background-color: rgba(255, 255, 255, .05);
  border: 1px solid $borderColor;
  color: $btnColor;
  text-align: center;
  cursor: pointer;

  &:hover {
    color: aquamarine;
    background-color: rgba(0, 206, 209, .1);
  }
}

.file {
  display: none;
}

.io-button-container {
  display: flex;
  flex-wrap: nowrap;
  flex-shrink: 0;
  gap: 0 1rem;
}

.io-button {
  @include common-button;
}

.subdivision {
  h4 {
    font-size: 1rem;
    font-weight: 400;
    padding-top: .125rem;
  }
}

.subdivision-controls {
  display: grid;
  width: 100%;
  gap: .75rem 0;
  grid-template-columns: 6.25rem 7.25rem 6.25rem 6.25rem;
  line-height: 1.875;
  margin: .25rem 0 1.125rem;


  @media screen and (max-width: 524px) {
    grid-template-columns: 1fr 7rem;
  }
}

@media screen and (min-width: 525px) {
  :deep(.sd-switch) {
    margin: auto 1rem auto auto;
  }

  :deep(.gap) {
    width: calc(100% - 1rem) !important;
  }
}
</style>
