import mapboxgl, { Map, type GeoJSONSource } from 'mapbox-gl'
import * as turf from '@turf/turf'
import type { Feature, GeoJsonProperties, Position, Polygon } from 'geojson'
import { extentGrid } from '~/utils/extentGrid'
import type { Mapbox, Grid, LngLat, GridPositions } from '~/types/types'


export const getGridAngle = (mapbox?: Ref<Mapbox>) => {
  const _mapbox = mapbox || useMapbox()
  const point1 = [_mapbox.value.settings.lng, _mapbox.value.settings.lat]
  const point2 = _mapbox.value.grid?.gridArea.features[0].geometry.coordinates[0][0]   // default: -135
  return (turf.rhumbBearing(point1, point2!) + 315) % 360 - 180
}


// -> Figure 1

const getPlayArea = (mapbox: Ref<Mapbox>, features: Feature<Polygon, GeoJsonProperties>[]) => {
  const grid = mapSpec[mapbox.value.settings.gridInfo].grid.play
  const area = grid
    ? turf.polygon([[
      features[grid[0]].geometry.coordinates[0][0],
      features[grid[1]].geometry.coordinates[0][1],
      features[grid[2]].geometry.coordinates[0][2],
      features[grid[3]].geometry.coordinates[0][3],
      features[grid[0]].geometry.coordinates[0][0],
    ]])
    : undefined
  return area
}


const getCenterArea = (mapbox: Ref<Mapbox>, features: Feature<Polygon, GeoJsonProperties>[]) => {
  const grid = mapSpec[mapbox.value.settings.gridInfo].grid.center
  const area = turf.polygon([[
    features[grid[0]].geometry.coordinates[0][0],
    features[grid[1]].geometry.coordinates[0][1],
    features[grid[2]].geometry.coordinates[0][2],
    features[grid[3]].geometry.coordinates[0][3],
    features[grid[0]].geometry.coordinates[0][0],
  ]])
  return area
}


const getRotateArea = (mapbox: Ref<Mapbox>, features: Feature<Polygon, GeoJsonProperties>[]) => {
  const grid = mapSpec[mapbox.value.settings.gridInfo].grid.rotate
  const area = turf.multiPolygon([[
    [
      features[grid[0][0]].geometry.coordinates[0][0],
      features[grid[0][1]].geometry.coordinates[0][1],
      features[grid[0][2]].geometry.coordinates[0][2],
      features[grid[0][3]].geometry.coordinates[0][3],
      features[grid[0][0]].geometry.coordinates[0][0],
    ],
    [
      features[grid[1][0]].geometry.coordinates[0][0],
      features[grid[1][1]].geometry.coordinates[0][1],
      features[grid[1][2]].geometry.coordinates[0][2],
      features[grid[1][3]].geometry.coordinates[0][3],
      features[grid[1][0]].geometry.coordinates[0][0],
    ],
    [
      features[grid[2][0]].geometry.coordinates[0][0],
      features[grid[2][1]].geometry.coordinates[0][1],
      features[grid[2][2]].geometry.coordinates[0][2],
      features[grid[2][3]].geometry.coordinates[0][3],
      features[grid[2][0]].geometry.coordinates[0][0],
    ],
    [
      features[grid[3][0]].geometry.coordinates[0][0],
      features[grid[3][1]].geometry.coordinates[0][1],
      features[grid[3][2]].geometry.coordinates[0][2],
      features[grid[3][3]].geometry.coordinates[0][3],
      features[grid[3][0]].geometry.coordinates[0][0],
    ],
  ]])
  return area
}


const getPosition = (feature: Feature<Polygon, GeoJsonProperties>, position: 'topleft' | 'topright' | 'bottomright' | 'bottomleft'): Position => {
  const corner = {
    topleft: 1,
    topright: 2,
    bottomright: 3,
    bottomleft: 0,
  }
  return [
    feature.geometry.coordinates[0][corner[position]][0],
    feature.geometry.coordinates[0][corner[position]][1],
  ]
}


const fixLng = (position: Position): Position => {
  const _lng = ((position[0] + 540) % 360) - 180
  return [_lng, position[1]]
}


export const getPoint = (grid: Grid) => {
  const mapbox = useMapbox()
  const gridIndex = mapSpec[mapbox.value.settings.gridInfo].grid
  const bottomleft = grid.gridArea.features[gridIndex.side[0]].geometry.coordinates[0][0]
  const topleft = grid.gridArea.features[gridIndex.side[1]].geometry.coordinates[0][1]
  const topright = grid.gridArea.features[gridIndex.side[2]].geometry.coordinates[0][2]
  const bottomright = grid.gridArea.features[gridIndex.side[3]].geometry.coordinates[0][3]
  const sides = {
    north: Math.max(bottomleft[1], topleft[1], topright[1], bottomright[1]),
    south: Math.min(bottomleft[1], topleft[1], topright[1], bottomright[1]),
    east: ((Math.max(bottomleft[0], topleft[0], topright[0], bottomright[0]) + 540) % 360) - 180,
    west: ((Math.min(bottomleft[0], topleft[0], topright[0], bottomright[0]) + 540) % 360) - 180,
  }
  const gridCorner: GridPositions = { topleft: fixLng(topleft), topright: fixLng(topright), bottomleft: fixLng(bottomleft), bottomright: fixLng(bottomright), _sides: sides }

  let playAreaCorner: GridPositions | undefined
  if (gridIndex.play) {
    const pBottomleft = grid.gridArea.features[gridIndex.play[0]].geometry.coordinates[0][0]
    const pTopleft = grid.gridArea.features[gridIndex.play[1]].geometry.coordinates[0][1]
    const pTopright = grid.gridArea.features[gridIndex.play[2]].geometry.coordinates[0][2]
    const pBottomright = grid.gridArea.features[gridIndex.play[3]].geometry.coordinates[0][3]
    const pSides = {
      north: Math.max(pBottomleft[1], pTopleft[1], pTopright[1], pBottomright[1]),
      south: Math.min(pBottomleft[1], pTopleft[1], pTopright[1], pBottomright[1]),
      east: ((Math.max(pBottomleft[0], pTopleft[0], pTopright[0], pBottomright[0]) + 540) % 360) - 180,
      west: ((Math.min(pBottomleft[0], pTopleft[0], pTopright[0], pBottomright[0]) + 540) % 360) - 180,
    }
    playAreaCorner = { topleft: fixLng(pTopleft), topright: fixLng(pTopright), bottomleft: fixLng(pBottomleft), bottomright: fixLng(pBottomright), _sides: pSides }
  }

  return { gridCorner, playAreaCorner }
}


export const getGrid = (mapbox: Ref<Mapbox>, lng: number, lat: number, size: number, angle: number) => {
  const grid = mapSpec[mapbox.value.settings.gridInfo].grid
  const { minX, minY, maxX, maxY } = getExtent(lng, lat, size)

  const gridArea = extentGrid(
    [minX, minY, maxX, maxY],
    grid.cell,
  )

  if (angle !== 0) {
    turf.transformRotate(gridArea, angle, { pivot: [lng, lat], mutate: true })
  }

  const playArea = getPlayArea(mapbox, gridArea.features)
  const centerArea = getCenterArea(mapbox, gridArea.features)
  const rotateArea = getRotateArea(mapbox, gridArea.features)

  const sideLines = turf.multiLineString([
    [getPosition(gridArea.features[grid.side[0]], 'bottomleft'),
      getPosition(gridArea.features[grid.side[1]], 'topleft')],
    [getPosition(gridArea.features[grid.side[1]], 'topleft'),
      getPosition(gridArea.features[grid.side[2]], 'topright')],
    [getPosition(gridArea.features[grid.side[2]], 'topright'),
      getPosition(gridArea.features[grid.side[3]], 'bottomright')],
    [getPosition(gridArea.features[grid.side[3]], 'bottomright'),
      getPosition(gridArea.features[grid.side[0]], 'bottomleft')],
  ])

  const midpoint = turf.midpoint(
    getPosition(gridArea.features[grid.center[1]], 'topleft'),
    getPosition(gridArea.features[grid.center[2]], 'topright'),
  )

  const direction =  turf.multiLineString([
    [getPosition(gridArea.features[grid.center[0]], 'bottomleft'), midpoint.geometry.coordinates],
    [midpoint.geometry.coordinates, getPosition(gridArea.features[grid.center[3]], 'bottomright')],
  ])

  const result: Grid = { gridArea, playArea, centerArea, rotateArea, sideLines, direction }
  return result
}


export const setGrid = (mapbox: Ref<Mapbox>, lnglat: LngLat, panTo: boolean) => {
  const _lng = ((lnglat[0] + 540) % 360) - 180
  let _lat = lnglat[1]
  if (lnglat[1] > 85) {
    _lat = 85
  } else if (lnglat[1] < -85) {
    _lat = -85
  }

  mapbox.value.isUpdating = true
  mapbox.value.settings.lng = _lng
  mapbox.value.settings.lat = _lat
  mapbox.value.grid = getGrid(mapbox, _lng, _lat, mapbox.value.settings.size, mapbox.value.settings.angle);

  (mapbox.value.map?.getSource('grid') as GeoJSONSource).setData(mapbox.value.grid.gridArea)
  if (mapbox.value.grid.playArea) {
    (mapbox.value.map?.getSource('play') as GeoJSONSource).setData(mapbox.value.grid.playArea)
  }
  (mapbox.value.map?.getSource('center') as GeoJSONSource).setData(mapbox.value.grid.centerArea);
  (mapbox.value.map?.getSource('rotate') as GeoJSONSource).setData(mapbox.value.grid.rotateArea);
  (mapbox.value.map?.getSource('side') as GeoJSONSource).setData(mapbox.value.grid.sideLines);
  (mapbox.value.map?.getSource('direction') as GeoJSONSource).setData(mapbox.value.grid.direction)

  mapbox.value.settings.zoom = mapbox.value.map!.getZoom()

  mapbox.value.isUpdating = false
  if (panTo) {
    mapbox.value.map?.panTo([mapbox.value.settings.lng, mapbox.value.settings.lat])
  }
  useEvent('map:changeLngLat', [mapbox.value.settings.lng, mapbox.value.settings.lat])
}


export const createMapInstance = () => {
  const mapbox = useMapbox()
  const config = useRuntimeConfig()

  mapboxgl.workerCount = 4

  mapbox.value.map = new Map({
    accessToken: config.public.token,
    antialias:   true,
    container:   'map',
    style:       initialValue.style,
    center:      [mapbox.value.settings.lng, mapbox.value.settings.lat],
    zoom:        mapbox.value.settings.zoom,
  })

  mapbox.value.grid = getGrid(
    mapbox,
    mapbox.value.settings.lng,
    mapbox.value.settings.lat,
    mapbox.value.settings.size,
    mapbox.value.settings.angle,
  )
}


export const useMapbox = () => {
  const mapbox = useState<Mapbox>('mapbox', () => {
    const map = undefined
    const grid = undefined
    const settings = useDefineSettings().value
    return {
      map,
      grid,
      settings,
      isUpdating: false,
    }
  })
  return mapbox
}


/**
 *    grid features ~ turf.squareGrid (Figure 1)
 *
 *    +---+---+---+---+---+---+---+---+---+
 *    | 8 |17 |26 |   |   |   |   |   |80 |
 *    +---+---+---+---+---+---+---+---+---+
 *    | 7 |   |   |   |   |   |   |   |   |
 *    +---+---1---+---+---+---+---2---+---+
 *    | 6 |   |24 | P | P | P |60 |   |   |
 *    +---+---+---+---+---+---+---+---+---+
 *    | 5 |   | P | P | P |50 | P |   |   |
 *    +---+---+---+---1---2---+---+---+---+
 *    | 4 |   | P | P |40 | P | P |   |   |
 *    +---+---+---+---0---3---+---+---+---+
 *    | 3 |   | P |30 | P | P | P |   |   |
 *    +---+---+---+---+---+---+---+---+---+
 *    | 2 |   |20 | P | P | P |56 |   |   |
 *    +---+---0---+---+---+---+---3---+---+
 *    | 1 |   |   |   |   |   |   |   |   |
 *    +---+---+---+---+---+---+---+---+---+
 *    | 0 | 9 |18 |   |   |   |   |   |72 |
 *    +---+---+---+---+---+---+---+---+---+
 *
 *    1---2
 *    |   |
 *    0/4-3
 */
