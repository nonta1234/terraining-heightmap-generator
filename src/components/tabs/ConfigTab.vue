<script setup lang="ts">
const mapbox = useMapbox()
const visibillity = ref(false)
const inputToken = ref<HTMLInputElement>()
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

const onOriginalPreviewChange = async (value: boolean) => {
  if (!isTokenValid() && value === true) {
    alert('To preview at the original resolution, a Mapbox access token is required.')
    await nextTick()
    mapbox.value.settings.originalPreview = false
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
    <div class="original-preview">
      <label class="original-preview-label" for="original-preview">Preview at original resolution&#8202;:&nbsp;&nbsp;</label>
      <ToggleSwitch v-model="mapbox.settings.originalPreview" :name="'original-preview'" :disabled="!hasToken" @change="onOriginalPreviewChange" />
      <div v-if="!hasToken" class="required">Access token required.</div>
    </div>
    <label for="url" class="label">Mapbox User Style URL&#8202;:</label>
    <div class="input-wrapper gap">
      <input id="url" v-model="mapbox.settings.userStyleURL" class="input" type="text" />
    </div>
    <label for="token" class="label">Mapbox Access Token&#8202;:</label>
    <div class="input-wrapper">
      <input id="token" ref="inputToken" v-model="mapbox.settings.accessToken" class="input" />
      <button class="visi-icon" @click="onVisibillityChange">
        <VisibilityOff v-if="visibillity" />
        <VisibilityOn v-else />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.original-preview {
  display: flex;
  margin-bottom: .75rem
}

.label {
  display: block;
  line-height: 2;
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

.gap {
  margin-bottom: .75rem;
}

:deep(.toggle-switch) {
  margin-right: 1rem;
}

.required {
  color: $textAlt;
  font-size: .75rem;
  line-height: 2;
}
</style>
