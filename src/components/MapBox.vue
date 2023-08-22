<script setup lang="ts">
import { NavigationControl } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const mapbox = useMapbox()
const { isMobile } = useDevice()
const { debugMode } = useDebug()

onMounted(() => {
  createMapInstance()

  let mapCanvas: HTMLElement

  mapbox.value.map?.on('load', () => {
    mapCanvas = mapbox.value.map!.getCanvasContainer()
  })

  mapbox.value.map?.on('style.load', () => {
    addSource()
    addTerrain()
    addEffectLayer()
    addLayer()
    addController()
    setMouse()
    if (debugMode.value) { mapbox.value.map!.showTileBoundaries = true }
  })

  mapbox.value.map?.on('idle', () => {
    saveSettings(mapbox.value.settings)
  })

  mapbox.value.map?.on('click', (e) => {
    setLngLat(mapbox, [e.lngLat.lng, e.lngLat.lat], true)
  })

  mapbox.value.map?.on('zoom', () => {
    mapbox.value.settings.zoom = mapbox.value.map!.getZoom()
  })

  function addSource() {
    mapbox.value.map?.addSource('grid', {
      type: 'geojson',
      data: mapbox.value.grid?.gridArea,
    })
    mapbox.value.map?.addSource('play', {
      type: 'geojson',
      data: mapbox.value.grid?.playArea,
    })
    mapbox.value.map?.addSource('center', {
      type: 'geojson',
      data: mapbox.value.grid!.centerArea,
    })
    mapbox.value.map?.addSource('corner', {
      type: 'geojson',
      data: mapbox.value.grid!.cornerPoints,
    })
    mapbox.value.map?.addSource('side', {
      type: 'geojson',
      data: mapbox.value.grid!.sideLines,
    })
    mapbox.value.map?.addSource('contours', {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-terrain-v2',
    })
    mapbox.value.map?.addSource('terrain-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    })
    mapbox.value.map?.addSource('hillshade-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    })
  }

  function addTerrain() {
    const exag = mapbox.value.settings.vertScale
    mapbox.value.map?.setTerrain({ source: 'terrain-dem', exaggeration: exag })
  }

  function addLayer() {
    mapbox.value.map?.addLayer({
      id: 'gridArea',
      type: 'fill',
      source: 'grid',
      paint: {
        'fill-color': 'rgba(128, 128, 128, 0.25)',
        'fill-outline-color': 'black',
        'fill-opacity': 1,
      },
    })
    mapbox.value.map?.addLayer({
      id: 'playArea',
      type: 'fill',
      source: 'play',
      paint: {
        'fill-color': 'green',
        'fill-opacity': 0.25,
      },
    })
    mapbox.value.map?.addLayer({
      id: 'centerArea',
      type: 'fill',
      source: 'center',
      paint: {
        'fill-color': 'blue',
        'fill-opacity': 0.2,
      },
    })
    mapbox.value.map?.addLayer({
      id: 'cornerPoints',
      type: 'circle',
      source: 'corner',
      paint: {
        'circle-radius': 10,
        'circle-color': '#F84C4C',
      },
    })
    mapbox.value.map?.addLayer({
      id: 'sideLines',
      type: 'line',
      source: 'side',
      paint: {
        'line-width': 7,
        'line-color': '#F84C4C',
      },
    })
  }

  function addEffectLayer() {
    mapbox.value.map?.addLayer({
      id: 'smoothLayer',
      type: 'fill',
      source: 'contours',
      'source-layer': 'contour',
      paint: {
        'fill-color': getSmoothLayerColor(),
        'fill-opacity': 0.5,
      },
    })
    mapbox.value.map?.addLayer({
      id: 'sharpenLayer',
      type: 'fill',
      source: 'contours',
      'source-layer': 'contour',
      paint: {
        'fill-color': getSharpenLayerColor(),
        'fill-opacity': 0.5,
      },
    })
    mapbox.value.map?.addLayer({
      id: 'hillshading',
      source: 'hillshade-dem',
      type: 'hillshade',
    },
    )
    mapbox.value.map?.moveLayer('smoothLayer', 'water')
    mapbox.value.map?.moveLayer('sharpenLayer', 'water')
    mapbox.value.map?.moveLayer('hillshading', 'water')
    mapbox.value.map?.setLayoutProperty('smoothLayer', 'visibility', 'none')
    mapbox.value.map?.setLayoutProperty('sharpenLayer', 'visibility', 'none')
    mapbox.value.map?.setLayoutProperty('hillshading', 'visibility', 'none')
  }

  function addController() {
    mapbox.value.map?.addControl(
      new NavigationControl({
        visualizePitch: true,
      }),
      isMobile ? 'top-right' : 'bottom-right',
    )
  }

  function onMove(e: any) {
    setLngLat(mapbox, [e.lngLat.lng, e.lngLat.lat], false)
  }

  function onUp(e: any) {
    setLngLat(mapbox, [e.lngLat.lng, e.lngLat.lat], false)
    mapbox.value.map?.off('mousemove', onMove)
    mapbox.value.map?.off('touchmove', onMove)
  }

  function setMouse() {
    mapbox.value.map?.on('mouseenter', 'centerArea', () => {
      mapbox.value.map!.setPaintProperty('centerArea', 'fill-opacity', 0.3)
      mapbox.value.map!.setPaintProperty('centerArea', 'fill-color', 'blue')
      mapCanvas.style.cursor = 'move'
    })

    mapbox.value.map?.on('mouseleave', 'centerArea', () => {
      mapbox.value.map!.setPaintProperty('centerArea', 'fill-color', 'blue')
      mapbox.value.map!.setPaintProperty('centerArea', 'fill-opacity', 0.2)
      mapCanvas.style.cursor = ''
    })

    mapbox.value.map?.on('mousedown', 'centerArea', (e) => {
      e.preventDefault()
      mapCanvas.style.cursor = 'grab'
      mapbox.value.map!.on('mousemove', onMove)
      mapbox.value.map!.once('mouseup', onUp)
    })

    mapbox.value.map?.on('touchstart', 'centerArea', (e) => {
      if (e.points.length !== 1) { return }
      e.preventDefault()
      mapbox.value.map!.on('touchmove', onMove)
      mapbox.value.map!.once('touchend', onUp)
    })
  }
})
</script>


<template>
  <div id="map"></div>
  <slot />
</template>


<style scoped>
  #map {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%;
  }
</style>
