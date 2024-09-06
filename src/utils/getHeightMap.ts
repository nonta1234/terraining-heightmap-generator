import GetHeightMapWorker from '~/assets/workers/getHeightmapWorker.ts?worker'
import type { MapType, GenerateMapOption, Settings } from '~/types/types'

type T = {
  heightmap: Float32Array
  heightmapImage?: ImageBitmap
}

const getHeightmapData = (mapType: MapType, settings: Settings, isDebug: boolean, resolution: number) => {
  const data: GenerateMapOption = {
    mapType,
    settings,
    isDebug,
    resolution,
  }
  const generateMapOption = JSON.parse(JSON.stringify(data))
  const worker = new GetHeightMapWorker()

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
 * @param resolution for preview
 * @return Promise\<Float32Array, ImageBitmap\>
 */
export const getHeightmap = async (mapType: MapType = 'cs1', isDebug = false, resolution?: number) => {
  try {
    const { settings } = useMapbox().value
    const _resolution = resolution || settings.resolution
    const result = await getHeightmapData(mapType, settings, isDebug, _resolution)
    return result
  } catch (error) {
    console.error('An error occurred in getHeightMap:', error)
    throw error
  }
}
