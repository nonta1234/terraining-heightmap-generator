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
  }
  else {
    visMobile.value = !visMobile.value
  }
}

const onLngLatChange = () => {
  setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], true)
}

const onZoomChange = () => {
  mapbox.value.map?.zoomTo(mapbox.value.settings.zoom)
}

const onAngleChange = () => {
  setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
}

const heightSet = () => {
  nextTick(() => {
    const { height } = getComputedStyle(contents.value)
    defaultHeight.value = '0'
    panelHeight.value = height
  })
}

const onResize = () => {
  heightSet()
}

useListen('panel:updateHeight', () => {
  heightSet()
})

useListen('panel:tabChange', () => {
  heightSet()
})

onMounted(() => {
  window.addEventListener('resize', onResize, true)
  heightSet()
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
        <label class="label">Lng&#8202;:</label>
        <NumberInput v-model="mapbox.settings.lng" class="input" :max="180" :min="-180" :step="0.00001" @change="onLngLatChange" />
        <label class="label">Lat&#8202;:</label>
        <NumberInput v-model="mapbox.settings.lat" :max="85" :min="-85" :step="0.00001" @change="onLngLatChange" />
      </div>
      <div class="item info">
        <label class="label">Zoom&#8202;:</label>
        <NumberInput v-model="mapbox.settings.zoom" :max="22" :min="0" :step="0.01" @change="onZoomChange" />
        <label class="label">Angle&#8202;:</label>
        <NumberInput v-model="mapbox.settings.angle" :max="180" :min="-180" :step="0.01" @change="onAngleChange" />
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
  padding: .375rem 0 0;
  border-radius: .375rem;
  color: $textColor;
  font-size: 1rem;
  z-index: 2;
  user-select: none;
  width: calc(27.5rem + 2px);
  max-width: calc(100vw - 20px);
  @include grass;
  :deep(.setting) {
    height: v-bind(defaultHeight);
    max-height: v-bind(defaultHeight);
    transition: .4s ease;
    &.d-active {
      height: v-bind(panelHeight);
      max-height: calc(100dvh - 4.5rem - 10px);
    }
    &.m-active {
      height: v-bind(panelHeight);
      max-height: calc(100dvh - 4.5rem - 84px);
    }
  }
  @include layout {
    width: calc(100vw - 71px);
    font-size: .875rem;
  }
}
.header {
  display: flex;
  justify-content: space-between;
  padding: 0 .75rem .375rem;
  :deep(.input-wrapper) {
    @include common-input;
    & {
      background-color: transparent;
      height: 1.5rem;
    }
    .input {
      text-align: right;
    }
  }
}

.item {
  display: grid;
  gap: 0 .25rem;
}
.coordinates {
  padding-right: calc(1rem - .125em);
  grid-template-columns: auto 6.5em;
  @media screen and (max-width: 410px) {
    grid-template-columns: auto 5.25em;
  }
}
.info {
  grid-template-columns: auto 4.75em;
  @media screen and (max-width: 410px) {
    grid-template-columns: auto 3.25em;
  }
}
.label {
  height: 1.5rem;
  line-height: 1.5;
}
.fab {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  overflow: hidden;
  display: block;
  flex-shrink: 0;
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
.contents {
  padding: 0 .75rem;
}
</style>
