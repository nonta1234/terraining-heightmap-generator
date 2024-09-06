import GetWaterMapWorker from '~/assets/workers/getWaterMapWorker.ts?worker'
import type { MapType, GenerateMapOption, Settings } from '~/types/types'

type T = {
  waterMap: Float32Array
  waterWayMap: Float32Array
  waterMapImage?: ImageBitmap
  waterWayMapImage?: ImageBitmap
  littImage?: ImageBitmap
  cornerImage?: ImageBitmap
}

const getWaterMapData = (mapType: MapType, settings: Settings, includeOcean: boolean, isDebug: boolean, resolution: number) => {
  const data: GenerateMapOption = {
    mapType,
    settings,
    includeOcean,
    isDebug,
    resolution,
  }
  const generateMapOption = JSON.parse(JSON.stringify(data))
  const worker = new GetWaterMapWorker()

  const result = new Promise<T>((resolve) => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data) {
        if (e.data.type === 'total') {
          useEvent('tile:total', e.data.number)
        } else if (e.data.type === 'progress') {
          useEvent('tile:progress')
        } else {
          resolve(e.data)
          worker.removeEventListener('message', handleMessage)
          worker.terminate()
        }
      }
    }
    worker.addEventListener('message', handleMessage)
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
export const getWaterMap = async (mapType: MapType = 'cs1', includeOcean: boolean, isDebug = false, resolution?: number) => {
  try {
    const { settings } = useMapbox().value
    const _resolution = resolution || settings.resolution
    const result = await getWaterMapData(mapType, settings, includeOcean, isDebug, _resolution)
    return result
  } catch (error) {
    console.error('An error occurred in getWaterMap:', error)
    throw error
  }
}
