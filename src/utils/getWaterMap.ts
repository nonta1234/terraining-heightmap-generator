import GetWaterMapWorker from '~/workers/getWaterMapWorker.ts?worker'
import type { MapType, GenerateMapOption } from '~/types/types'

type T = {
  waterMap: Float32Array;
  waterWayMap: Float32Array;
  waterMapImage?: ImageBitmap;
  waterWayMapImage?: ImageBitmap;
  littImage?: ImageBitmap;
  cornerImage?: ImageBitmap;
}

const getWaterMapData = (message: any) => {
  const worker = new GetWaterMapWorker()
  const result = new Promise<T>((resolve) => {
    worker.addEventListener('message', (e) => {
      if (e.data) {
        resolve(e.data)
        worker.terminate()
      }
    }, { once: true })
  })
  worker.postMessage(message)
  return result
}

/**
 * Get heightmap in Float32Array. Also returns ImageBitmap for debugging.
 * @param mapType default 'cs1'
 * @param isDebug default false
 * @return Promise\<Float32Array, ImageBitmap\>
 */
export const getWaterMap = async (mapType: MapType = 'cs1', isDebug = false) => {
  try {
    const { settings } = useMapbox().value
    const config = useRuntimeConfig()
    if ((mapType !== 'cs1') && (settings.accessToken === '' || settings.accessToken === config.public.token)) {
      alert(NEED_TOKEN)
      throw new Error('Invaid access token')
    }
    const token = settings.gridInfo === 'cs1' ? config.public.token : (settings.accessToken || config.public.token)
    const data: GenerateMapOption = {
      mapType,
      settings,
      token,
      isDebug,
    }
    const generateMapOption = JSON.parse(JSON.stringify(data))
    const result = await getWaterMapData(generateMapOption)
    return result
  } catch (error) {
    console.error('An error occurred in getWaterMap:', error)
    throw error
  }
}
