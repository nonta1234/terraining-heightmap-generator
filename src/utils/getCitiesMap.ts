import type { MapType } from '~/types/types'

/**
 * Start Worker, get heightmap and watermap, synthesize, and return heightmap of Uint8Array
 * @param mapType
 * @returns Promise\<Uint8Array\>
 */
export const getCitiesMap = async (mapType: MapType) => {
  try {
    const mapbox = useMapbox()
    const config = useRuntimeConfig()
    const token = mapType === 'cs1' ? config.public.token : (mapbox.value.settings.accessToken || config.public.token)
    // const scaleFactor = mapbox.value.settings.gridInfo === 'cs2' ? (mapbox.value.settings.elevationScale / 65535) : 0.015625

    const waterCanvases = []
    const canvasesData = useState<OffscreenCanvas[]>('canvases').value
    for (let i = 1; i < 4; i++) {
      waterCanvases.push(canvasesData[i])
    }
    const tileCanvas = canvasesData[0]


    await getHeightMap(mapbox.value.settings, token, mapType)


    return null
  } catch (error) {
    console.error('An error occurred in getCitiesMap:', error)
    throw error
  }
}
