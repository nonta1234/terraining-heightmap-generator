import GetHeightMapWorker from '~/workers/getHeightMapWorker.ts?worker'
import type { MapType, Settings, GenerateMapOption, MessageData } from '~/types/types'

const getHeightMapData = (message: MessageData) => {
  return new Promise<Uint8Array>((resolve) => {
    const worker = new GetHeightMapWorker()
    console.log(message)
    worker.addEventListener('message', (e) => {
      if (e.data) {
        resolve(e.data)
        worker.terminate()
      }
    }, false)
    worker.postMessage(message, message.canvases)
  })
}

/**
 * Get heightmap
 * @param setings - Mapbox Settings
 * @param token - for download tiles of cs2
 * @param canvas - OffscreenCanvas for internal use
 * @param mapType - default 'cs1'
 */
export const getHeightMap = async (settings: Settings, token: string, mapType: MapType = 'cs1') => {
  try {
    const data: GenerateMapOption = {
      mapType,
      settings,
      token,
    }
    const canvas = useState<OffscreenCanvas[]>('canvases').value[0]
    console.log(canvas)
    const generateMapOption = JSON.parse(JSON.stringify(data))
    const canvases = [canvas]
    const result = await getHeightMapData({ data: generateMapOption, canvases })
    return result
  } catch (error) {
    console.error('An error occurred in getHeightMap:', error)
    throw error
  }
}
