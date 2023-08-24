<script setup lang="ts">
import { NavigationControl } from 'mapbox-gl'
import * as turf from '@turf/turf'
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
    mapbox.value.map?.addSource('direction', {
      type: 'geojson',
      data: mapbox.value.grid!.direction,
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
        'fill-color': 'rgba(128, 128, 128, 0.5)',
        'fill-outline-color': 'black',
        'fill-opacity': 0.5,
      },
    })
    mapbox.value.map?.addLayer({
      id: 'playArea',
      type: 'fill',
      source: 'play',
      paint: {
        'fill-color': 'green',
        'fill-opacity': 0.23,
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
      id: 'sideLines',
      type: 'line',
      source: 'side',
      paint: {
        'line-width': 7,
        'line-color': '#1E90FF',
        'line-opacity': 0,
      },
    })
    mapbox.value.map?.addLayer({
      id: 'cornerPoints',
      type: 'circle',
      source: 'corner',
      filter: ['all', ['!=', 'meta', 'midpoint']],
      paint: {
        'circle-color': '#1E90FF',
        'circle-radius': 10,
        'circle-blur': 1,
        'circle-opacity': 0,
      },
    })
    mapbox.value.map?.addLayer({
      id: 'directionMarker',
      type: 'line',
      source: 'direction',
      paint: {
        'line-width': 0.5,
        'line-color': 'black',
        'line-opacity': 0.7,
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

  let prevAngle = 0

  function onRotateStart(e: any) {
    const point1 = [mapbox.value.settings.lng, mapbox.value.settings.lat]
    const point2 = [e.lngLat.lng, e.lngLat.lat]
    prevAngle = turf.rhumbBearing(point1, point2)
  }

  function onRotate(e: any) {
    const point1 = [mapbox.value.settings.lng, mapbox.value.settings.lat]
    const point2 = [e.lngLat.lng, e.lngLat.lat]
    const currentAngle = turf.rhumbBearing(point1, point2)
    const delta = currentAngle - prevAngle
    mapbox.value.settings.angle = ((delta + mapbox.value.settings.angle + 540) % 360) - 180

    setLngLat(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)

    mapbox.value.settings.angle = getGridAngle()
    prevAngle = currentAngle
  }

  function onRotateEnd() {
    mapbox.value.settings.angle = getGridAngle()
    mapCanvas.style.cursor = ''
    mapbox.value.map?.off('mousemove', onRotate)
    mapbox.value.map?.off('touchmove', onRotate)
  }

  function setMouse() {
    mapbox.value.map?.on('mouseenter', 'centerArea', () => {
      mapbox.value.map!.setPaintProperty('centerArea', 'fill-opacity', 0.3)
      mapCanvas.style.cursor = 'move'
    })

    mapbox.value.map?.on('mouseleave', 'centerArea', () => {
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

    mapbox.value.map?.on('mouseenter', 'cornerPoints', () => {
      mapbox.value.map!.setPaintProperty('cornerPoints', 'circle-radius', 20)
      mapbox.value.map!.setPaintProperty('cornerPoints', 'circle-opacity', 0.4)
      mapCanvas.style.cursor = 'move'
    })

    mapbox.value.map?.on('mouseleave', 'cornerPoints', () => {
      mapbox.value.map!.setPaintProperty('cornerPoints', 'circle-radius', 10)
      mapbox.value.map!.setPaintProperty('cornerPoints', 'circle-opacity', 0)
      mapCanvas.style.cursor = ''
    })

    mapbox.value.map?.on('mousedown', 'cornerPoints', (e) => {
      e.preventDefault()
      onRotateStart(e)
      mapbox.value.map!.on('mousemove', onRotate)
      mapbox.value.map!.once('mouseup', onRotateEnd)
    })

    mapbox.value.map?.on('touchstart', 'cornerPoints', (e) => {
      if (e.points.length !== 1) { return }
      e.preventDefault()
      onRotateStart(e)
      mapbox.value.map!.on('touchmove', onRotate)
      mapbox.value.map!.once('touchend', onRotateEnd)
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
