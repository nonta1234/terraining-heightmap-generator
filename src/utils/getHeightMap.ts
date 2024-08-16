import GetHeightMapWorker from '~/assets/workers/getHeightmapWorker.ts?worker'
import type { MapType, GenerateMapOption, Settings } from '~/types/types'

type T = {
  heightmap: Float32Array
  heightmapImage?: ImageBitmap
}

const getHeightmapData = (mapType: MapType, settings: Settings, token: string, isDebug: boolean, resolution: number) => {
  const data: GenerateMapOption = {
    mapType,
    settings,
    token,
    isDebug,
    resolution,
  }
  const generateMapOption = JSON.parse(JSON.stringify(data))
  const worker = new GetHeightMapWorker()
  const result = new Promise<T>((resolve) => {
    worker.addEventListener('message', (e) => {
      if (e.data) {
        resolve(e.data)
        worker.terminate()
      }
    }, { once: true })
  })
  worker.postMessage(generateMapOption)
  return result
}

/**
 * Get heightmap in Float32Array. Also returns ImageBitmap for debugging.
 * @param mapType default 'cs1'
 * @param isDebug default false
 * @param resolution for preview
 * @return Promise\<Float32Array, ImageBitmap\>
 */
export const getHeightmap = async (mapType: MapType = 'cs1', preview = false, isDebug = false, resolution?: number) => {
  try {
    const { settings } = useMapbox().value
    const config = useRuntimeConfig()
    if (!(preview === true || mapType === 'cs1') && !isTokenValid()) {
      throw new Error('Invaid access token')
    }
    let token = (settings.gridInfo === 'cs1' || preview === true) ? (settings.accessToken || config.public.mapboxToken) : settings.accessToken
    if (mapType === 'ocean') {
      token = config.public.maptilerToken
    }
    const _resolution = resolution || settings.resolution
    const result = await getHeightmapData(mapType, settings, token, isDebug, _resolution)
    return result
  } catch (error) {
    console.error('An error occurred in getHeightMap:', error)
    throw error
  }
}
