import type { Mapbox, MapType } from '~/types/types'











const { topleft, bottomright } = getExtentInWorldPixel(
  mapbox.value.settings.lng,
  mapbox.value.settings.lat,
  areaSize * Math.SQRT2,
)










export const getHeightMap2 = async (mapType: MapType = 'cs1') => {
  try {
    const mapbox = useMapbox()
    if (mapbox.value.settings.interpolation === 'bicubic') {
      return await getHeightMapBicubic(mapType)
    } else {
      return await getHeightMapBilinear(mapType)
    }
  } catch (error) {
    console.error('An error occurred in getHeightMap:', error)
    throw error
  }
}
