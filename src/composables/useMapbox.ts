import { Map, GeoJSONSource } from 'mapbox-gl'
import * as turf from '@turf/turf'
import { Feature, BBox, GeoJsonProperties, Position, Polygon } from 'geojson'
import { Mapbox, Grid, LngLat } from '~/types/types'


export const getExtent = (lng: number, lat: number, topleftSize: number, bottomrightSize: number) => {
  const topleftDist = Math.sqrt(2 * Math.pow(topleftSize, 2))
  const bottomrightDist = Math.sqrt(2 * Math.pow(bottomrightSize, 2))
  const point = turf.point([lng, lat])
  const topleft = turf.destination(point, topleftDist, -45, { units: 'kilometers' }).geometry.coordinates
  const bottomright = turf.destination(point, bottomrightDist, 135, { units: 'kilometers' }).geometry.coordinates
  return { topleft, bottomright }
}

// -> Figure 1

const getPlayAreaBBox = (features: Feature<Polygon, GeoJsonProperties>[]) => {
  const pBox = [
    features[20].geometry.coordinates[0][0][0],
    features[20].geometry.coordinates[0][0][1],
    features[60].geometry.coordinates[0][2][0],
    features[60].geometry.coordinates[0][2][1],
  ]
  return pBox as BBox
}

const getCenterAreaBBox = (features: Feature<Polygon, GeoJsonProperties>[]) => {
  const cBox = [
    features[40].geometry.coordinates[0][0][0],
    features[40].geometry.coordinates[0][0][1],
    features[40].geometry.coordinates[0][2][0],
    features[40].geometry.coordinates[0][2][1],
  ]
  return cBox as BBox
}

const getPosition = (feature: Feature<Polygon, GeoJsonProperties>, position: 'topleft' | 'topright' | 'bottomright' | 'bottomleft') => {
  const corner = {
    topleft: 0,
    topright: 1,
    bottomright: 2,
    bottomleft: 3,
  }
  return [
    feature.geometry.coordinates[0][corner[position]][0],
    feature.geometry.coordinates[0][corner[position]][1],
  ] as Position
}

const getGrid = (lng: number, lat: number, size: number, angle: number) => {
  const extent = getExtent(lng, lat, size * 1.05 / 2, size * 1.05 / 2)
  const gridArea = turf.squareGrid(
    [extent.topleft[0], extent.topleft[1], extent.bottomright[0], extent.bottomright[1]],
    size / 9,
    { units: 'kilometers' },
  )
  const playArea = turf.bboxPolygon(getPlayAreaBBox(gridArea.features))
  const centerArea =  turf.bboxPolygon(getCenterAreaBBox(gridArea.features))

  const cornerPoints = turf.multiPoint(
    [
      getPosition(gridArea.features[0], 'topleft'),
      getPosition(gridArea.features[8], 'topright'),
      getPosition(gridArea.features[80], 'bottomright'),
      getPosition(gridArea.features[72], 'bottomleft'),
    ],
  )

  const sideLines = turf.multiLineString(
    [
      [getPosition(gridArea.features[0], 'topleft'), getPosition(gridArea.features[8], 'topright')],
      [getPosition(gridArea.features[8], 'topright'), getPosition(gridArea.features[80], 'bottomright')],
      [getPosition(gridArea.features[80], 'bottomright'), getPosition(gridArea.features[72], 'bottomleft')],
      [getPosition(gridArea.features[72], 'bottomleft'), getPosition(gridArea.features[0], 'topleft')],
    ],
  )

  turf.transformRotate(gridArea, angle, { pivot: [lng, lat], mutate: true })
  turf.transformRotate(gridArea, angle, { pivot: [lng, lat], mutate: true })
  turf.transformRotate(gridArea, angle, { pivot: [lng, lat], mutate: true })
  turf.transformRotate(gridArea, angle, { pivot: [lng, lat], mutate: true })

  const grid: Grid = { gridArea, playArea, centerArea, cornerPoints, sideLines }
  return grid
}


export const setLngLat = (mapbox: Ref<Mapbox>, lnglat: LngLat, panTo: boolean) => {
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
  (mapbox.value.map?.getSource('corner') as GeoJSONSource).setData(mapbox.value.grid.cornerPoints);
  (mapbox.value.map?.getSource('side') as GeoJSONSource).setData(mapbox.value.grid.sideLines)

  mapbox.value.isUpdating = false
  if (panTo) {
    mapbox.value.map?.panTo([mapbox.value.settings.lng, mapbox.value.settings.lat])
  }
  useEvent('map:changeLngLat', [mapbox.value.settings.lng, mapbox.value.settings.lat])
}


export const createMapInstance = () => {
  const mapbox = useMapbox()
  const config = useRuntimeConfig()

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

  mapbox.value.settings = useDefineSettings().value
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
 *    | 0 | 1 | 2 |   |   |   |   |   |   |
 *    +---+---+---+---+---+---+---+---+---+
 *    | 9 |   |   |   |   |   |   |   |   |
 *    +---+---0---+---+---+---+---+---+---+
 *    |18 |   |20 | P | P | P | P |   |   |
 *    +---+---+---+---+---+---+---+---+---+
 *    |27 |   | P | P | P | P | P |   |   |
 *    +---+---+---+---0---+---+---+---+---+
 *    |36 |   | P | P |40 | P | P |   |   |
 *    +---+---+---+---+---2---+---+---+---+
 *    |45 |   | P | P | P | P | P |   |   |
 *    +---+---+---+---+---+---+---+---+---+
 *    |54 |   | P | P | P | P |60 |   |   |
 *    +---+---+---+---+---+---+---2---+---+
 *    |   |   |   |   |   |   |   |   |   |
 *    +---+---+---+---+---+---+---+---+---+
 *    |   |   |   |   |   |   |   |   |80 |
 *    +---+---+---+---+---+---+---+---+---+
 *
 *    4
 *    0---1
 *    |   |
 *    3---2
 */
