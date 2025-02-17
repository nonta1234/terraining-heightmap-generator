<script setup lang="ts">
import * as turf from '@turf/turf'
import type { Feature, LineString, Position, GeoJsonProperties } from 'geojson'
import { NavigationControl } from 'mapbox-gl'
import { effectRasterColorMix } from '~/utils/const'

const mapbox = useMapbox()
const { debugMode } = useDebug()
const { isMobile } = useDevice()

const mapCanvas = ref<HTMLElement>()

type GridState = 'none' | 'isMove' | 'isRotate' | 'isResize'
let gridState: GridState = 'none'
let prevAngle = 0
let animationFrameId: number | null = null

const maxSize = computed(() => (mapSpec[mapbox.value.settings.gridInfo].defaultSize || 50.000) * 4)
const minSize = computed(() => (mapSpec[mapbox.value.settings.gridInfo].defaultSize || 1.000) / 2)

onMounted(() => {
  createMapInstance()

  mapbox.value.map?.on('load', () => {
    mapCanvas.value = mapbox.value.map!.getCanvasContainer()
    addController()
    setMouse()
  })

  mapbox.value.map?.on('style.load', (e) => {
    addSource()
    addTerrain()
    addEffectLayer(e.target.style.stylesheet.name!)
    addGridLayer(e.target.style.stylesheet.name!)
    if (debugMode.value) {
      mapbox.value.map!.showTileBoundaries = true
    }
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
    if (mapbox.value.grid?.playArea) {
      mapbox.value.map?.addSource('play', {
        type: 'geojson',
        data: mapbox.value.grid?.playArea,
      })
    }
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
    const hScale = (mapSpec[mapbox.value.settings.gridInfo].defaultSize || mapbox.value.settings.size) / mapbox.value.settings.size
    mapbox.value.map?.setTerrain({ source: 'terrain-dem', exaggeration: mapbox.value.settings.vertScale / hScale })
  }

  function addGridLayer(styleName: string) {
    const gridColor = styleList[styleName!].grid
    const alpha = styleList[styleName!].alpha

    mapbox.value.map?.addLayer({
      id: 'gridArea',
      type: 'fill',
      source: 'grid',
      paint: {
        'fill-color': `rgba(0, 0, 0, ${alpha})`,
        'fill-outline-color': gridColor,
        'fill-opacity': 0.5,
      },
    })
    if (mapbox.value.grid?.playArea) {
      mapbox.value.map?.addLayer({
        id: 'playArea',
        type: 'fill',
        source: 'play',
        paint: {
          'fill-color': 'green',
          'fill-opacity': 0.23,
        },
      })
    }
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
    })
    mapbox.value.map?.addLayer({
      id: 'directionMarker',
      type: 'line',
      source: 'direction',
      paint: {
        'line-width': 0.5,
        'line-color': gridColor,
        'line-opacity': 0.7,
      },
    })
  }

  function addEffectLayer(styleName: string) {
    const layerPosition = styleList[styleName!].before

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
        },
      },
      layerPosition,
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
        },
      },
      layerPosition,
    )

    mapbox.value.map?.addLayer(
      {
        id: 'hillshading',
        source: 'hillshade-dem',
        type: 'hillshade',
      },
      layerPosition,
    )

    if (!mapbox.value.settings.displayEffectArea) {
      mapbox.value.map?.setLayoutProperty('hillshading', 'visibility', 'none')
      mapbox.value.map?.setLayoutProperty('smoothLayer', 'visibility', 'none')
      mapbox.value.map?.setLayoutProperty('sharpenLayer', 'visibility', 'none')
    }
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

  const addStyleButton = () => {
    mapbox.value.map?.addControl(
      new StyleButton(), isMobile ? 'top-right' : 'bottom-right',
    )
  }

  const addEffectArea = () => {
    mapbox.value.map?.addControl(
      new EffectedArea(mapbox.value.settings.displayEffectArea), isMobile ? 'top-right' : 'bottom-right',
    )
  }

  function addController() {
    if (isMobile) {
      addHomeButton()
      addNavigationControl()
      addResetGridDirection()
      addStyleButton()
      addEffectArea()
    } else {
      addEffectArea()
      addStyleButton()
      addResetGridDirection()
      addNavigationControl()
      addHomeButton()
    }
  }

  function onMove(e: any) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
    animationFrameId = requestAnimationFrame(() => {
      setGrid(mapbox, [e.lngLat.lng, e.lngLat.lat], false)
      animationFrameId = null
    })
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
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
    const rotate = () => {
      const point1 = [mapbox.value.settings.lng, mapbox.value.settings.lat]
      const point2 = [e.lngLat.lng, e.lngLat.lat]
      const currentAngle = turf.rhumbBearing(point1, point2)
      const delta = currentAngle - prevAngle
      mapbox.value.settings.angle = mapbox.value.settings.angle + delta
      setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
      mapbox.value.settings.angle = getGridAngle(mapbox)
      prevAngle = currentAngle
    }
    animationFrameId = requestAnimationFrame(() => {
      rotate()
      animationFrameId = null
    })
  }

  function onRotateEnd() {
    setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
    mapbox.value.settings.angle = getGridAngle(mapbox)
    mapCanvas.value!.style.cursor = ''
    mapbox.value.map?.off('mousemove', onRotate)
    mapbox.value.map?.off('touchmove', onRotate)
    mapbox.value.map?.scrollZoom.enable()
    gridState = 'none'
  }

  let lineString: Feature<LineString, GeoJsonProperties>

  function getFarthestLineString(coordinates: Position[][], point: turf.Coord) {
    let farthestLineString: Feature<LineString, GeoJsonProperties> | undefined
    let maxDistance = 0

    for (let i = 0; i < coordinates.length; i++) {
      const line = turf.lineString(coordinates[i])
      const distance = turf.pointToLineDistance(point, line)
      if (distance > maxDistance) {
        maxDistance = distance
        farthestLineString = line
      }
    }
    return farthestLineString as Feature<LineString, GeoJsonProperties>
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
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
    const resize = () => {
      let distance = turf.pointToLineDistance([e.lngLat.lng, e.lngLat.lat], lineString, { units: 'kilometers' })
      if (distance < minSize.value) { distance = minSize.value }
      if (distance > maxSize.value) { distance = maxSize.value }
      const tmpRatio = mapbox.value.settings.vertScale / (mapSpec[mapbox.value.settings.gridInfo].defaultSize || mapbox.value.settings.size) * mapbox.value.settings.size
      mapbox.value.settings.size = distance
      if (mapbox.value.settings.fixedRatio) {
        mapbox.value.settings.vertScale = tmpRatio * (mapSpec[mapbox.value.settings.gridInfo].defaultSize || mapbox.value.settings.size) / mapbox.value.settings.size
      }
      setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
      useEvent('map:changeMapSize', mapbox.value.settings.size)
    }
    animationFrameId = requestAnimationFrame(() => {
      resize()
      animationFrameId = null
    })
  }

  function onResizeEnd() {
    setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
    mapCanvas.value!.style.cursor = ''
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
      mapCanvas.value!.style.cursor = 'move'
    })

    mapbox.value.map?.on('mouseleave', 'centerArea', () => {
      mapbox.value.map!.setPaintProperty('centerArea', 'fill-opacity', 0.2)
      mapCanvas.value!.style.cursor = ''
    })

    mapbox.value.map?.on('mousedown', 'centerArea', (e) => {
      if (gridState === 'none') {
        e.preventDefault()
        mapCanvas.value!.style.cursor = 'grab'
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
      mapCanvas.value!.style.cursor = 'move'
    })

    mapbox.value.map?.on('mouseleave', 'rotateArea', () => {
      mapbox.value.map!.setPaintProperty('rotateArea', 'fill-color', 'rgba(0, 0, 0, 0)')
      mapCanvas.value!.style.cursor = ''
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
      mapCanvas.value!.style.cursor = 'move'
    })

    mapbox.value.map?.on('mouseleave', 'sideLines', () => {
      mapbox.value.map!.setPaintProperty('sideLines', 'line-opacity', 0)
      mapbox.value.map!.setPaintProperty('sideLines', 'line-width', 10)
      mapCanvas.value!.style.cursor = ''
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

  .select-menu {
    width: 41px;
    height: 41px;
    margin-bottom: 10px;
  }

  button, .native-icon {
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
    border: solid 1px $textColor;
    @include grass-button;

    &:hover {
      border: solid 1px aquamarine;
      @include shadow-4
    }

    svg {
      margin: auto;
    }
  }

  .select-menu-box:focus-within {
    .native-icon {
      border: solid 1px aquamarine;
      @include shadow-4
    }
  }

  .select-menu-icon {
    color: $textColor !important;

    &:hover, &:active, &:focus {
      color: $textColor !important;
    }

    svg {
      margin: 10px auto auto;
    }
  }
}

:deep(.mapboxgl-ctrl-top-right) {
  margin-top: 10px;
}

:deep(.mapboxgl-ctrl) {
  margin-top: 0;
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
