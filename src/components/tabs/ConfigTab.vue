<script setup lang="ts">
import { settingsSchema, type Settings } from '~/types/types'
const mapbox = useMapbox()
const visibillity = ref(false)
const visibillityMT = ref(false)
const inputToken = ref<HTMLInputElement>()
const inputTokenMT = ref<HTMLInputElement>()
const fileEl = ref<HTMLInputElement>()
const hasToken = computed(() => isTokenValid())

watch(hasToken, () => {
  if (!hasToken.value) {
    mapbox.value.settings.originalPreview = false
  }
})

const onVisibillityChange = () => {
  visibillity.value = !visibillity.value
  inputToken.value!.type = visibillity.value ? 'text' : 'password'
}

const onVisibillityChangeMT = () => {
  visibillityMT.value = !visibillityMT.value
  inputTokenMT.value!.type = visibillityMT.value ? 'text' : 'password'
}

const onOriginalPreviewChange = async (value: boolean) => {
  if (!isTokenValid() && value === true) {
    alert('To preview at the original resolution, a Mapbox access token is required.')
    await nextTick()
    mapbox.value.settings.originalPreview = false
  }
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
  console.log('change')
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
  if (!isTokenValid() && mapbox.value.settings.originalPreview === true) {
    mapbox.value.settings.originalPreview = false
  }
  inputToken.value!.type = visibillity.value ? 'text' : 'password'
})
</script>

<template>
  <div id="config-tab">
    <div class="checkbox">
      <label class="label" for="original-preview">Preview at original resolution&#8202;:&nbsp;&nbsp;</label>
      <ToggleSwitch v-model="mapbox.settings.originalPreview" :name="'original-preview'" :disabled="!hasToken" @change="onOriginalPreviewChange" />
    </div>
    <hr>
    <label for="token-mt" class="label">MapTiler Access Token <small>(Required)</small>&#8202;:</label>
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

:deep(.toggle-switch) {
  margin-right: 1rem;
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
</style>
