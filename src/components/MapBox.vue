<script setup lang="ts">
import * as turf from '@turf/turf'
import { NavigationControl } from 'mapbox-gl'

const mapbox = useMapbox()
const { debugMode } = useDebug()
const { isMobile } = useDevice()

type GridState = 'none' | 'isMove' | 'isRotate' | 'isResize'
let gridState: GridState = 'none'
let prevAngle = 0

const { $throttle } = useNuxtApp()

onMounted(() => {
  createMapInstance()

  let mapCanvas: HTMLElement

  mapbox.value.map?.on('load', () => {
    mapCanvas = mapbox.value.map!.getCanvasContainer()
    mapbox.value.map!.setStyle({
      ...mapbox.value.map!.getStyle(),
      version: 8,
    })
  })

  mapbox.value.map?.on('style.load', () => {
    addSource()
    addTerrain()
    addEffectLayer()
    addController()
    addLayer()
    setMouse()
    if (debugMode.value) { mapbox.value.map!.showTileBoundaries = true }
  })

  mapbox.value.map?.on('idle', () => {
    saveSettings(mapbox.value.settings)
  })

  mapbox.value.map?.on('click', (e) => {
    setGrid(mapbox, [e.lngLat.lng, e.lngLat.lat], true)
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
    mapbox.value.map?.addSource('terrain-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    })
    mapbox.value.map?.addSource('raster-dem', {
      type: 'raster',
      // tiles: ['https://api.mapbox.com/v4/mapbox.mapbox-terrain-dem-v1/{z}/{x}/{y}.pngraw'],
      tiles: ['https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw'],
      tileSize: 256,
      maxzoom: 15,
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
        'line-width': isMobile ? 20 : 10,
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
        'fill-color': 'rgba(0, 0, 0, 0)',
        'fill-outline-color': 'blue',
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
    mapbox.value.map?.addLayer(
      {
        id: 'smoothLayer',
        type: 'raster',
        source: 'raster-dem',
        paint: {
          'raster-color-range': effectRasterColorRange,
          'raster-color-mix': effectRasterColorMix,
          'raster-color': getSmoothLayerColor(),
          'raster-opacity': getRasterOpacity(mapbox.value.settings.smoothing),
          'raster-resampling': 'nearest',
        } as any,
      },
      'waterway-shadow',
    )

    mapbox.value.map?.addLayer(
      {
        id: 'sharpenLayer',
        type: 'raster',
        source: 'raster-dem',
        paint: {
          'raster-color-range': effectRasterColorRange,
          'raster-color-mix': effectRasterColorMix,
          'raster-color': getSharpenLayerColor(),
          'raster-opacity': getRasterOpacity(mapbox.value.settings.sharpen),
          'raster-resampling': 'nearest',
        } as any,
      },
      'waterway-shadow',
    )

    mapbox.value.map?.addLayer(
      {
        id: 'hillshading',
        source: 'hillshade-dem',
        type: 'hillshade',
      },
      'waterway-shadow',
    )

    mapbox.value.map?.setLayoutProperty('smoothLayer', 'visibility', 'none')
    mapbox.value.map?.setLayoutProperty('sharpenLayer', 'visibility', 'none')
    mapbox.value.map?.setLayoutProperty('hillshading', 'visibility', 'none')
  }

  const addResetGridDirection = () => {
    mapbox.value.map?.addControl(
      new ResetGridDirection(), isMobile ? 'top-right' : 'bottom-right',
    )
  }

  const addNavigationControl = () => {
    mapbox.value.map?.addControl(
      new NavigationControl({
        visualizePitch: true,
      }),
      isMobile ? 'top-right' : 'bottom-right',
    )
  }

  const addHomeButton = () => {
    mapbox.value.map?.addControl(
      new HomeButton(), isMobile ? 'top-right' : 'bottom-right',
    )
  }

  const addEffectArea = () => {
    mapbox.value.map?.addControl(
      new EffectedArea(), isMobile ? 'top-right' : 'bottom-right',
    )
  }

  function addController() {
    if (isMobile) {
      addHomeButton()
      addNavigationControl()
      addResetGridDirection()
      addEffectArea()
    } else {
      addEffectArea()
      addResetGridDirection()
      addNavigationControl()
      addHomeButton()
    }
  }

  function onMove(e: any) {
    $throttle(setGrid(mapbox, [e.lngLat.lng, e.lngLat.lat], false), 1000 / 60)
  }

  function onUp(e: any) {
    setGrid(mapbox, [e.lngLat.lng, e.lngLat.lat], false)
    mapbox.value.map?.off('mousemove', onMove)
    mapbox.value.map?.off('touchmove', onMove)
    gridState = 'none'
  }

  function onRotateStart(e: any) {
    gridState = 'isRotate'
    mapbox.value.map?.scrollZoom.disable()
    const point1 = [mapbox.value.settings.lng, mapbox.value.settings.lat]
    const point2 = [e.lngLat.lng, e.lngLat.lat]
    prevAngle = turf.rhumbBearing(point1, point2)
  }

  function onRotate(e: any) {
    const rotate = () => {
      const point1 = [mapbox.value.settings.lng, mapbox.value.settings.lat]
      const point2 = [e.lngLat.lng, e.lngLat.lat]
      const currentAngle = turf.rhumbBearing(point1, point2)
      const delta = currentAngle - prevAngle
      mapbox.value.settings.angle = ((delta + mapbox.value.settings.angle + 540) % 360) - 180

      setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)

      mapbox.value.settings.angle = getGridAngle()
      prevAngle = currentAngle
    }
    $throttle(rotate(), 1000 / 60)
  }

  function onRotateEnd() {
    setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
    mapbox.value.settings.angle = getGridAngle()
    mapCanvas.style.cursor = ''
    mapbox.value.map?.off('mousemove', onRotate)
    mapbox.value.map?.off('touchmove', onRotate)
    mapbox.value.map?.scrollZoom.enable()
    gridState = 'none'
  }

  let lineString: turf.helpers.Feature<turf.helpers.LineString, turf.helpers.Properties>

  function getFarthestLineString(coordinates: turf.Position[][], point: turf.Coord) {
    let farthestLineString: turf.helpers.Feature<turf.helpers.LineString, turf.helpers.Properties> | undefined
    let maxDistance = 0

    for (let i = 0; i < coordinates.length; i++) {
      const line = turf.lineString(coordinates[i])
      const distance = turf.pointToLineDistance(point, line)
      if (distance > maxDistance) {
        maxDistance = distance
        farthestLineString = line
      }
    }
    return farthestLineString as turf.helpers.Feature<turf.helpers.LineString, turf.helpers.Properties>
  }

  function onResizeStart(e: any) {
    gridState = 'isResize'
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
    const resize = () => {
      let distance = turf.pointToLineDistance([e.lngLat.lng, e.lngLat.lat], lineString, { units: 'kilometers' })
      if (distance < mapSpec[mapbox.value.settings.gridInfo].size) { distance = mapSpec[mapbox.value.settings.gridInfo].size }
      if (distance > mapSpec[mapbox.value.settings.gridInfo].size * 4) { distance = mapSpec[mapbox.value.settings.gridInfo].size * 4 }
      const tmpRatio = mapbox.value.settings.vertScale / mapSpec[mapbox.value.settings.gridInfo].size * mapbox.value.settings.size
      mapbox.value.settings.size = distance
      if (mapbox.value.settings.fixedRatio) {
        mapbox.value.settings.vertScale = tmpRatio * mapSpec[mapbox.value.settings.gridInfo].size / mapbox.value.settings.size
      }
      setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
      useEvent('map:changeMapSize', mapbox.value.settings.size)
    }
    $throttle(resize(), 1000 / 60)
  }

  function onResizeEnd() {
    setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
    mapCanvas.style.cursor = ''
    mapbox.value.map?.off('mousemove', onResize)
    mapbox.value.map?.off('touchmove', onResize)
    useEvent('map:changeMapSize', mapbox.value.settings.size)
    mapbox.value.map?.scrollZoom.enable()
    gridState = 'none'
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
      if (gridState === 'none') {
        e.preventDefault()
        mapCanvas.style.cursor = 'grab'
        mapbox.value.map!.on('mousemove', onMove)
        mapbox.value.map!.once('mouseup', onUp)
        gridState = 'isMove'
      }
    })

    mapbox.value.map?.on('touchstart', 'centerArea', (e) => {
      if (gridState === 'none') {
        if (e.points.length !== 1) { return }
        e.preventDefault()
        mapbox.value.map!.on('touchmove', onMove)
        mapbox.value.map!.once('touchend', onUp)
      }
    })

    // rotateArea - rotate
    mapbox.value.map?.on('mouseenter', 'rotateArea', () => {
      mapbox.value.map!.setPaintProperty('rotateArea', 'fill-color', 'rgba(0, 0, 0, 0)')
      mapCanvas.style.cursor = 'move'
    })

    mapbox.value.map?.on('mouseleave', 'rotateArea', () => {
      mapbox.value.map!.setPaintProperty('rotateArea', 'fill-color', 'rgba(0, 0, 0, 0)')
      mapCanvas.style.cursor = ''
    })

    mapbox.value.map?.on('mousedown', 'rotateArea', (e) => {
      if (gridState === 'none') {
        e.preventDefault()
        onRotateStart(e)
        mapbox.value.map!.on('mousemove', onRotate)
        mapbox.value.map!.once('mouseup', onRotateEnd)
      }
    })

    mapbox.value.map?.on('touchstart', 'rotateArea', (e) => {
      if (gridState === 'none') {
        if (e.points.length !== 1) { return }
        e.preventDefault()
        onRotateStart(e)
        mapbox.value.map!.on('touchmove', onRotate)
        mapbox.value.map!.once('touchend', onRotateEnd)
      }
    })

    // sideLines - resize
    mapbox.value.map?.on('mouseenter', 'sideLines', () => {
      mapbox.value.map!.setPaintProperty('sideLines', 'line-width', 5)
      mapbox.value.map!.setPaintProperty('sideLines', 'line-opacity', 0.3)
      mapCanvas.style.cursor = 'move'
    })

    mapbox.value.map?.on('mouseleave', 'sideLines', () => {
      mapbox.value.map!.setPaintProperty('sideLines', 'line-opacity', 0)
      mapbox.value.map!.setPaintProperty('sideLines', 'line-width', 10)
      mapCanvas.style.cursor = ''
    })

    mapbox.value.map?.on('mousedown', 'sideLines', (e) => {
      if (gridState === 'none') {
        e.preventDefault()
        onResizeStart(e)
        mapbox.value.map!.on('mousemove', onResize)
        mapbox.value.map!.once('mouseup', onResizeEnd)
      }
    })

    mapbox.value.map?.on('touchstart', 'sideLines', (e) => {
      if (gridState === 'none') {
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


<style lang="scss" scoped>
  #map {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%;
  }
  :deep(.mapboxgl-ctrl-group) {
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    button {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      outline: none;
      overflow: hidden;
      display: block;
      width: 41px;
      height: 41px;
      color: $textColor;
      background: transparent;
      text-align: center;
      border-radius: 100%;
      margin-bottom: 10px;
      svg {
        margin: auto;
      }
      border: solid 1px $textColor;
      @include grass-button;
      &:hover {
        color: aquamarine;
        border: solid 1px aquamarine;
      }
    }
  }
  :deep(.mapboxgl-ctrl) {
    margin-bottom: 0;
  }
  :deep(.mapboxgl-ctrl button.mapboxgl-ctrl-zoom-in .mapboxgl-ctrl-icon) {
    background-image: url("../assets/svg/zoomin.svg");
  }
  :deep(.mapboxgl-ctrl button.mapboxgl-ctrl-zoom-out .mapboxgl-ctrl-icon) {
    background-image: url("../assets/svg/zoomout.svg");
  }
  :deep(.mapboxgl-ctrl button.mapboxgl-ctrl-compass .mapboxgl-ctrl-icon) {
    background-image: url("../assets/svg/compass.svg");
  }
</style>
