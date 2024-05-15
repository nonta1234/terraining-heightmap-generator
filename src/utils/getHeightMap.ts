import GetHeightMapWorker from '~/assets/workers/getHeightmapWorker.ts?worker'
import type { MapType, GenerateMapOption, Settings } from '~/types/types'

type T = {
  heightmap: Float32Array;
  heightmapImage?: ImageBitmap;
}

const getHeightmapData = (mapType: MapType, settings: Settings, token: string, isDebug: boolean) => {
  const data: GenerateMapOption = {
    mapType,
    settings,
    token,
    isDebug,
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
 * @return Promise\<Float32Array, ImageBitmap\>
 */
export const getHeightmap = async (mapType: MapType = 'cs1', isDebug = false) => {
  try {
    const { settings } = useMapbox().value
    const config = useRuntimeConfig()
    if ((mapType !== 'cs1') && (settings.accessToken === '' || settings.accessToken === config.public.token)) {
      throw new Error('Invaid access token')
    }
    const token = settings.gridInfo === 'cs1' ? config.public.token : (settings.accessToken || config.public.token)
    const result = await getHeightmapData(mapType, settings, token, isDebug)
    return result
  } catch (error) {
    console.error('An error occurred in getHeightMap:', error)
    throw error
  }
}
