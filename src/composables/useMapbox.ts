import mapboxgl, { Map, GeoJSONSource } from 'mapbox-gl'
import * as turf from '@turf/turf'
import type { Feature, GeoJsonProperties, Position, Polygon } from 'geojson'
import type { Mapbox, Grid, LngLat } from '~/types/types'


export const getExtent = (lng: number, lat: number, topleftSize: number, bottomrightSize: number) => {
  const topleftDist = Math.sqrt(2 * Math.pow(topleftSize, 2))
  const bottomrightDist = Math.sqrt(2 * Math.pow(bottomrightSize, 2))
  const point = turf.point([lng, lat])
  const topleft = turf.destination(point, topleftDist, -45, { units: 'kilometers' }).geometry.coordinates
  const bottomright = turf.destination(point, bottomrightDist, 135, { units: 'kilometers' }).geometry.coordinates
  return { topleft, bottomright }
}


export const getGridAngle = () => {
  const mapbox = useMapbox()
  const point1 = [mapbox.value.settings.lng, mapbox.value.settings.lat]
  const point2 = mapbox.value.grid?.gridArea.features[0].geometry.coordinates[0][0]

  return ((turf.rhumbBearing(point1, point2!) + 585) % 360) - 180
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


const getPosition = (feature: Feature<Polygon, GeoJsonProperties>, position: 'topleft' | 'topright' | 'bottomright' | 'bottomleft') => {
  const corner = {
    topleft: 0,
    topright: 3,
    bottomright: 2,
    bottomleft: 1,
  }
  return [
    feature.geometry.coordinates[0][corner[position]][0],
    feature.geometry.coordinates[0][corner[position]][1],
  ] as Position
}


const getGrid = (lng: number, lat: number, size: number, angle: number) => {
  const mapbox = useMapbox()
  const extent = getExtent(lng, lat, size * 1.03 / 2, size * 1.03 / 2)
  const gridArea = turf.squareGrid(
    [extent.topleft[0], extent.topleft[1], extent.bottomright[0], extent.bottomright[1]],
    size / mapSpec[mapbox.value.settings.gridInfo].cell,
    { units: 'kilometers' },
  )

  if (angle !== 0) {
    turf.transformRotate(gridArea, angle, { pivot: [lng, lat], mutate: true })
  }

  const playArea = getPlayArea(gridArea.features)
  const centerArea = getCenterArea(gridArea.features)
  const rotateArea = getRotateArea(gridArea.features)

  const sideLines = turf.multiLineString([
    [getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[0]], 'topleft'), getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[3]], 'topright')],
    [getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[3]], 'topright'), getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[2]], 'bottomright')],
    [getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[2]], 'bottomright'), getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[1]], 'bottomleft')],
    [getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[1]], 'bottomleft'), getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].side[0]], 'topleft')],
  ])

  const midpoint = turf.midpoint(
    getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].center[0]], 'topleft'),
    getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].center[3]], 'topright'),
  )

  const direction =  turf.multiLineString([
    [getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].center[1]], 'bottomleft'), midpoint.geometry.coordinates],
    [midpoint.geometry.coordinates, getPosition(gridArea.features[mapSpec[mapbox.value.settings.gridInfo].center[2]], 'bottomright')],
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
 *    | 0 | 9 |18 |27 |36 |45 |54 |63 |72 |
 *    +---+---+---+---+---+---+---+---+---+
 *    | 1 |   |   |   |   |   |   |   |   |
 *    +---+---0---+---+---+---+---+---+---+
 *    | 2 |   |20 | P | P | P | P |   |   |
 *    +---+---+---+---+---+---+---+---+---+
 *    | 3 |   | P |30 | P | P | P |   |   |
 *    +---+---+---+---0---+---+---+---+---+
 *    | 4 |   | P | P |40 | P | P |   |   |
 *    +---+---+---+---+---2---+---+---+---+
 *    | 5 |   | P | P | P |50 | P |   |   |
 *    +---+---+---+---+---+---+---+---+---+
 *    | 6 |   | P | P | P | P |60 |   |   |
 *    +---+---+---+---+---+---+---2---+---+
 *    | 7 |   |   |   |   |   |   |   |   |
 *    +---+---+---+---+---+---+---+---+---+
 *    | 8 |   |   |   |   |   |   |   |80 |
 *    +---+---+---+---+---+---+---+---+---+
 *
 *    4
 *    0---3
 *    |   |
 *    1---2
 */
