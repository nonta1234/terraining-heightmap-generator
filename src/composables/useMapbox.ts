import mapboxgl, { Map, GeoJSONSource } from 'mapbox-gl'
import * as turf from '@turf/turf'
import type { Feature, GeoJsonProperties, Position, Polygon } from 'geojson'
import { extentGrid } from '~/utils/extentGrid'
import type { Mapbox, Grid, LngLat, GridPositions } from '~/types/types'


export const getGridAngle = () => {
  const mapbox = useMapbox()
  const point1 = [mapbox.value.settings.lng, mapbox.value.settings.lat]
  const point2 = mapbox.value.grid?.gridArea.features[0].geometry.coordinates[0][0]   // default: -135
  return (turf.rhumbBearing(point1, point2!) + 315) % 360 - 180
}


// -> Figure 1

const getPlayArea = (features: Feature<Polygon, GeoJsonProperties>[]) => {
  const mapbox = useMapbox()
  const area = turf.polygon([[
    features[mapSpec[mapbox.value.settings.gridInfo].play[0]].geometry.coordinates[0][0],
    features[mapSpec[mapbox.value.settings.gridInfo].play[1]].geometry.coordinates[0][1],
    features[mapSpec[mapbox.value.settings.gridInfo].play[2]].geometry.coordinates[0][2],
    features[mapSpec[mapbox.value.settings.gridInfo].play[3]].geometry.coordinates[0][3],
    features[mapSpec[mapbox.value.settings.gridInfo].play[0]].geometry.coordinates[0][0],
  ]])
  return area
}


const getCenterArea = (features: Feature<Polygon, GeoJsonProperties>[]) => {
  const mapbox = useMapbox()
  const area = turf.polygon([[
    features[mapSpec[mapbox.value.settings.gridInfo].center[0]].geometry.coordinates[0][0],
    features[mapSpec[mapbox.value.settings.gridInfo].center[1]].geometry.coordinates[0][1],
    features[mapSpec[mapbox.value.settings.gridInfo].center[2]].geometry.coordinates[0][2],
    features[mapSpec[mapbox.value.settings.gridInfo].center[3]].geometry.coordinates[0][3],
    features[mapSpec[mapbox.value.settings.gridInfo].center[0]].geometry.coordinates[0][0],
  ]])
  return area
}


const getRotateArea = (features: Feature<Polygon, GeoJsonProperties>[]) => {
  const mapbox = useMapbox()
  const area = turf.multiPolygon([[
    [
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[0][0]].geometry.coordinates[0][0],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[0][1]].geometry.coordinates[0][1],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[0][2]].geometry.coordinates[0][2],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[0][3]].geometry.coordinates[0][3],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[0][0]].geometry.coordinates[0][0],
    ],
    [
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[1][0]].geometry.coordinates[0][0],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[1][1]].geometry.coordinates[0][1],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[1][2]].geometry.coordinates[0][2],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[1][3]].geometry.coordinates[0][3],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[1][0]].geometry.coordinates[0][0],
    ],
    [
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[2][0]].geometry.coordinates[0][0],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[2][1]].geometry.coordinates[0][1],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[2][2]].geometry.coordinates[0][2],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[2][3]].geometry.coordinates[0][3],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[2][0]].geometry.coordinates[0][0],
    ],
    [
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[3][0]].geometry.coordinates[0][0],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[3][1]].geometry.coordinates[0][1],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[3][2]].geometry.coordinates[0][2],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[3][3]].geometry.coordinates[0][3],
      features[mapSpec[mapbox.value.settings.gridInfo].rotate[3][0]].geometry.coordinates[0][0],
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
  const bottomleft = grid.gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[0]].geometry.coordinates[0][0]
  const topleft = grid.gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[1]].geometry.coordinates[0][1]
  const topright = grid.gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[2]].geometry.coordinates[0][2]
  const bottomright = grid.gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[3]].geometry.coordinates[0][3]
  const sides = {
    north: Math.max(bottomleft[1], topleft[1], topright[1], bottomright[1]),
    south: Math.min(bottomleft[1], topleft[1], topright[1], bottomright[1]),
    east: ((Math.max(bottomleft[0], topleft[0], topright[0], bottomright[0]) + 540) % 360) - 180,
    west: ((Math.min(bottomleft[0], topleft[0], topright[0], bottomright[0]) + 540) % 360) - 180,
  }
  const gridCorner: GridPositions = { topleft: fixLng(topleft), topright: fixLng(topright), bottomleft: fixLng(bottomleft), bottomright: fixLng(bottomright), _sides: sides }
  const pBottomleft = grid.gridArea.features[mapSpec[mapbox.value.settings.gridInfo].play[0]].geometry.coordinates[0][0]
  const pTopleft = grid.gridArea.features[mapSpec[mapbox.value.settings.gridInfo].play[1]].geometry.coordinates[0][1]
  const pTopright = grid.gridArea.features[mapSpec[mapbox.value.settings.gridInfo].play[2]].geometry.coordinates[0][2]
  const pBottomright = grid.gridArea.features[mapSpec[mapbox.value.settings.gridInfo].play[3]].geometry.coordinates[0][3]
  const pSides = {
    north: Math.max(pBottomleft[1], pTopleft[1], pTopright[1], pBottomright[1]),
    south: Math.min(pBottomleft[1], pTopleft[1], pTopright[1], pBottomright[1]),
    east: ((Math.max(pBottomleft[0], pTopleft[0], pTopright[0], pBottomright[0]) + 540) % 360) - 180,
    west: ((Math.min(pBottomleft[0], pTopleft[0], pTopright[0], pBottomright[0]) + 540) % 360) - 180,
  }
  const playAreaCorner: GridPositions = { topleft: fixLng(pTopleft), topright: fixLng(pTopright), bottomleft: fixLng(pBottomleft), bottomright: fixLng(pBottomright), _sides: pSides }
  return { gridCorner, playAreaCorner }
}


export const getGrid = (lng: number, lat: number, size: number, angle: number) => {
  const mapbox = useMapbox()
  const { minX, minY, maxX, maxY } = getExtent(lng, lat, size)

  const gridArea = extentGrid(
    [minX, minY, maxX, maxY],
    mapSpec[mapbox.value.settings.gridInfo].cell,
  )

  if (angle !== 0) {
    turf.transformRotate(gridArea, angle, { pivot: [lng, lat], mutate: true })
  }

  const playArea = getPlayArea(gridArea.features)
  const centerArea = getCenterArea(gridArea.features)
  const rotateArea = getRotateArea(gridArea.features)

  const sideLines = turf.multiLineString([
    [getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[0]], 'bottomleft'),
      getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[1]], 'topleft')],
    [getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[1]], 'topleft'),
      getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[2]], 'topright')],
    [getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[2]], 'topright'),
      getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[3]], 'bottomright')],
    [getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[3]], 'bottomright'),
      getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[0]], 'bottomleft')],
  ])

  const midpoint = turf.midpoint(
    getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].center[1]], 'topleft'),
    getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].center[2]], 'topright'),
  )

  const direction =  turf.multiLineString([
    [getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].center[0]], 'bottomleft'), midpoint.geometry.coordinates],
    [midpoint.geometry.coordinates, getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].center[3]], 'bottomright')],
  ])

  const grid: Grid = { gridArea, playArea, centerArea, rotateArea, sideLines, direction }
  return grid
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
  mapbox.value.grid = getGrid(_lng, _lat, mapbox.value.settings.size, mapbox.value.settings.angle);

  (mapbox.value.map?.getSource('grid') as GeoJSONSource).setData(mapbox.value.grid.gridArea);
  (mapbox.value.map?.getSource('play') as GeoJSONSource).setData(mapbox.value.grid.playArea);
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

  // eslint-disable-next-line import/no-named-as-default-member
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
