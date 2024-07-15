<script setup lang="ts">
const mapbox = useMapbox()
const { isDesktopOrTablet } = useDevice()

const contents = ref()
const defaultHeight = ref('auto')
const panelHeight = ref('auto')

const visDesktop = ref(false)
const visMobile = ref(false)

const visibillity = computed(() => isDesktopOrTablet ? visDesktop.value : visMobile.value)

const changeVisibillity = () => {
  if (isDesktopOrTablet) {
    visDesktop.value = !visDesktop.value
  } else {
    visMobile.value = !visMobile.value
  }
}

const onLngChange = (value: number) => {
  setGrid(mapbox, [value, mapbox.value.settings.lat], true)
}

const onLatChange = (value: number) => {
  setGrid(mapbox, [mapbox.value.settings.lng, value], true)
}

const onZoomChange = (value: number) => {
  mapbox.value.map?.zoomTo(value)
}

const onAngleChange = (value: number) => {
  mapbox.value.settings.angle = value
  setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
}

onMounted(() => {
  nextTick(() => {
    const { height } = getComputedStyle(contents.value)
    defaultHeight.value = '0'
    panelHeight.value = `${height}px`
  })
})
</script>


<template>
  <div id="info-panel">
    <section class="header">
      <div class="item">
        <button class="fab" @click="changeVisibillity">
          <font-awesome-icon v-if="!visibillity" :icon="['fas', 'bars']" class="fa-fw fa-lg" />
          <font-awesome-icon v-else :icon="['fas', 'xmark']" class="fa-fw fa-xl" />
        </button>
      </div>
      <div class="item coordinates">
        <label>Lng&#8202;:</label>
        <NumberInput :value="mapbox.settings.lng" :max="180" :min="-180" :step="0.00001" @change="onLngChange" />
        <label>Lat&#8202;:</label>
        <NumberInput :value="mapbox.settings.lat" :max="85" :min="-85" :step="0.00001" @change="onLatChange" />
      </div>
      <div class="item info">
        <label>{{ isDesktopOrTablet ? 'Zoom Level' : 'Zoom' }}&#8202;:</label>
        <NumberInput :value="mapbox.settings.zoom" :max="22" :min="0" :step="0.01" @change="onZoomChange" />
        <label>{{ isDesktopOrTablet ? 'Grid Angle' : 'Angle' }}&#8202;:</label>
        <NumberInput :value="mapbox.settings.angle" :max="180" :min="-180" :step="0.01" @change="onAngleChange" />
      </div>
    </section>
    <OverlayScrollbars :class="['setting', { 'm-active': visMobile, 'd-active': visDesktop }]">
      <section ref="contents" class="contents">
        <ContentsArea />
      </section>
    </OverlayScrollbars>
  </div>
</template>


<style lang="scss" scoped>
#info-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: .375rem .75rem;
  border-radius: .375rem;
  color: $textColor;
  font-size: 1rem;
  z-index: 2;
  user-select: none;
  max-width: calc(100vw - 20px);
  @include grass;
  :deep(.setting) {
    height: v-bind(defaultHeight);
    max-height: v-bind(defaultHeight);
    transition: .4s ease;
    &.d-active {
      height: v-bind(panelHeight);
      max-height: calc(100dvh - 4.5rem - 40px);
    }
    &.m-active {
      height: v-bind(panelHeight);
      max-height: calc(100dvh - 5.5rem - 110px);
    }
  }
}
.header {
  display: flex;
  justify-content: space-between;
}
.item {
  display: grid;
  gap: 0 .25rem;
}
.coordinates {
  padding-right: calc(1rem - .125em);
  grid-template-columns: auto 6.25em;
}
.info {
  padding-left: 1rem;
  grid-template-columns: auto 4.5em;
  border-left: solid 1px $borderColor
}
label {
  height: 1.5rem;
  line-height: 1.5;
}
input {
  background-color: transparent;
  height: 1.5rem;
  padding-right: .125em;
  &:active {
    background-color: $inputBgF;
  }
  &:focus {
    background-color: $inputBgF;
  }
}
input[input] {
  color: #FFA500;
}
@media screen and (max-width: 480px) {
  #info-panel {
    width: calc(100vw - 20px);
    font-size: .875rem;
  }
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
}
.fab {
  display: block;
  color: $textColor;
  height: 2.5rem;
  width: 2.5rem;
  border-radius: 100%;
  text-align: center;
  background-color: rgba(255, 255, 255, .2);
  line-height: 1;
  margin: auto 1rem auto 0;
  cursor: pointer;
  @include shadow-2;
  &:hover, &:focus {
    color: aquamarine;
    background-color: rgba(0, 206, 209, .35);
    @include shadow-3;
  }
  svg {
    margin: auto;
  }
}
</style>
