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
    mapbox.value.map?.addSource('rotate', {
      type: 'geojson',
      data: mapbox.value.grid!.rotateArea,
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
      layout: {
        'line-join': 'miter',
      },
      paint: {
        'line-width': 10,
        'line-color': '#1E90FF',
        'line-blur': 1,
        'line-opacity': 0,
      },
    })
    mapbox.value.map?.addLayer({
      id: 'rotateArea',
      type: 'fill',
      source: 'rotate',
      paint: {
        'fill-color': 'blue',
        'fill-opacity': 0.1,
      },
      layout: {},
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

  function onUp() {
    mapbox.value.map?.off('mousemove', onMove)
    mapbox.value.map?.off('touchmove', onMove)
  }

  let enterRotateArea = false
  let prevAngle = 0

  function onRotateStart(e: any) {
    mapbox.value.map?.scrollZoom.disable()
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
    mapbox.value.map?.scrollZoom.enable()
  }

  let lineString: turf.Feature<turf.LineString>

  function getFarthestLineString(coordinates: turf.Position[][], point: turf.Coord) {
    let farthestLineString: any
    let maxDistance = 0

    for (let i = 0; i < coordinates.length; i++) {
      const line = turf.lineString(coordinates[i])
      const distance = turf.pointToLineDistance(point, line)
      if (distance > maxDistance) {
        maxDistance = distance
        farthestLineString = line
      }
    }
    return farthestLineString
  }

  function onResizeStart(e: any) {
    mapbox.value.map?.scrollZoom.disable()
    const features = mapbox.value.map?.queryRenderedFeatures(e.point, {
      layers: ['sideLines'],
    })
    if (features!.length > 0) {
      const lineStringGeometry = features![0].geometry
      if (lineStringGeometry.type === 'MultiLineString') {
        lineString = getFarthestLineString(lineStringGeometry.coordinates, [e.lngLat.lng, e.lngLat.lat])
      }
    }
  }

  function onResize(e: any) {
    let distance = turf.pointToLineDistance([e.lngLat.lng, e.lngLat.lat], lineString, { units: 'kilometers' })
    if (distance < 17.28) { distance = 17.28 }
    if (distance > 69.12) { distance = 69.12 }
    const tmpRatio = mapbox.value.settings.vertScale / 17.28 * mapbox.value.settings.size
    mapbox.value.settings.size = distance
    if (mapbox.value.settings.fixedRatio) {
      mapbox.value.settings.vertScale = tmpRatio * 17.28 / mapbox.value.settings.size
    }
    setLngLat(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
    useEvent('map:changeMapSize', mapbox.value.settings.size)
  }

  function onResizeEnd() {
    mapCanvas.style.cursor = ''
    mapbox.value.map?.off('mousemove', onResize)
    mapbox.value.map?.off('touchmove', onResize)
    mapbox.value.map?.scrollZoom.disable()
    useEvent('map:changeMapSize', mapbox.value.settings.size)
    mapbox.value.map?.scrollZoom.enable()
  }

  function setMouse() {
    // centerArea - move
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

    // rotateArea - rotate
    mapbox.value.map?.on('mouseenter', 'rotateArea', () => {
      enterRotateArea = true
      mapbox.value.map!.setPaintProperty('sideLines', 'line-opacity', 0)
      mapbox.value.map!.setPaintProperty('rotateArea', 'fill-opacity', 0.2)
      mapCanvas.style.cursor = 'move'
    })

    mapbox.value.map?.on('mouseleave', 'rotateArea', () => {
      mapbox.value.map!.setPaintProperty('rotateArea', 'fill-opacity', 0.1)
      mapCanvas.style.cursor = ''
      enterRotateArea = false
    })

    mapbox.value.map?.on('mousedown', 'rotateArea', (e) => {
      e.preventDefault()
      onRotateStart(e)
      mapbox.value.map!.on('mousemove', onRotate)
      mapbox.value.map!.once('mouseup', onRotateEnd)
    })

    mapbox.value.map?.on('touchstart', 'rotateArea', (e) => {
      if (e.points.length !== 1) { return }
      e.preventDefault()
      onRotateStart(e)
      mapbox.value.map!.on('touchmove', onRotate)
      mapbox.value.map!.once('touchend', onRotateEnd)
    })

    // sideLines - resize
    mapbox.value.map?.on('mouseenter', 'sideLines', () => {
      if (!enterRotateArea) {
        mapbox.value.map!.setPaintProperty('sideLines', 'line-width', 5)
        mapbox.value.map!.setPaintProperty('sideLines', 'line-opacity', 0.3)
        mapCanvas.style.cursor = 'move'
      }
    })

    mapbox.value.map?.on('mouseleave', 'sideLines', () => {
      mapbox.value.map!.setPaintProperty('sideLines', 'line-opacity', 0)
      mapbox.value.map!.setPaintProperty('sideLines', 'line-width', 10)
      mapCanvas.style.cursor = ''
    })

    mapbox.value.map?.on('mousedown', 'sideLines', (e) => {
      if (!enterRotateArea) {
        e.preventDefault()
        onResizeStart(e)
        mapbox.value.map!.on('mousemove', onResize)
        mapbox.value.map!.once('mouseup', onResizeEnd)
      }
    })

    mapbox.value.map?.on('touchstart', 'sideLines', (e) => {
      if (!enterRotateArea) {
        if (e.points.length !== 1) { return }
        e.preventDefault()
        onResizeStart(e)
      mapbox.value.map!.on('touchmove', onResize)
      mapbox.value.map!.once('touchend', onResizeEnd)
      }
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
