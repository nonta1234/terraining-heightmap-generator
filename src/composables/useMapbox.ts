import { Map, GeoJSONSource } from 'mapbox-gl'
import * as turf from '@turf/turf'
import { FeatureCollection, Feature, BBox, Geometry, GeoJsonProperties } from 'geojson'
import { Mapbox, Grid, LngLat } from '~/types/types'

type T = Feature<Geometry, GeoJsonProperties>
type S = FeatureCollection<Geometry, GeoJsonProperties>


export const getExtent = (lng: number, lat: number, topleftSize: number, bottomrightSize: number) => {
  const topleftDist = Math.sqrt(2 * Math.pow(topleftSize, 2))
  const bottomrightDist = Math.sqrt(2 * Math.pow(bottomrightSize, 2))
  const point = turf.point([lng, lat])
  const topleft = turf.destination(point, topleftDist, -45, { units: 'kilometers' }).geometry.coordinates
  const bottomright = turf.destination(point, bottomrightDist, 135, { units: 'kilometers' }).geometry.coordinates
  return { topleft, bottomright }
}

// -> Figure 1

const getPlayAreaBBox = (features: turf.helpers.Feature<turf.helpers.Polygon, GeoJsonProperties>[]) => {
  const pBox = [
    features[20].geometry.coordinates[0][0][0],
    features[20].geometry.coordinates[0][0][1],
    features[60].geometry.coordinates[0][2][0],
    features[60].geometry.coordinates[0][2][1],
  ]
  return pBox as BBox
}

const getCenterAreaBBox = (features: turf.helpers.Feature<turf.helpers.Polygon, GeoJsonProperties>[]) => {
  const cBox = [
    features[40].geometry.coordinates[0][0][0],
    features[40].geometry.coordinates[0][0][1],
    features[40].geometry.coordinates[0][2][0],
    features[40].geometry.coordinates[0][2][1],
  ]
  return cBox as BBox
}

const getGrid = (lng: number, lat: number, size: number) => {
  const extent = getExtent(lng, lat, size * 1.05 / 2, size * 1.05 / 2)
  const gridArea = turf.squareGrid<GeoJsonProperties>(
    [extent.topleft[0], extent.topleft[1], extent.bottomright[0], extent.bottomright[1]],
    size / 9,
    { units: 'kilometers' },
  )
  const playArea = turf.bboxPolygon<GeoJsonProperties>(getPlayAreaBBox(gridArea.features))
  const centerArea =  turf.bboxPolygon<GeoJsonProperties>(getCenterAreaBBox(gridArea.features))
  const grid: Grid = { gridArea, playArea, centerArea }
  return grid
}


export const setLngLat = (mapbox: Ref<Mapbox>, lnglat: LngLat, panTo: boolean) => {
  const _lng = ((lnglat[0] + 540) % 360) - 180
  let _lat = lnglat[1]
  if (lnglat[1] > 85.05112878) {
    _lat = 85.05112878
  } else if (lnglat[1] < -85.05112878) {
    _lat = -85.05112878
  }

  mapbox.value.isUpdating = true
  mapbox.value.settings.lng = _lng
  mapbox.value.settings.lat = _lat
  mapbox.value.grid = getGrid(_lng, _lat, mapbox.value.settings.size);
  (mapbox.value.map?.getSource('grid') as GeoJSONSource).setData(mapbox.value.grid.gridArea as S);
  (mapbox.value.map?.getSource('play') as GeoJSONSource).setData(mapbox.value.grid.playArea as T);
  (mapbox.value.map?.getSource('center') as GeoJSONSource).setData(mapbox.value.grid.centerArea as T)
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
 *    0---3
 *    |   |
 *    1---2
 */
