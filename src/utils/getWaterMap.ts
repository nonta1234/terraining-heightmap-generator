import GetWaterMapWorker from '~/workers/getWaterMapWorker.ts?worker'
import type { MapType, GenerateMapOption } from '~/types/types'

const getWaterMapData = (message: any) => {
  const worker = useState<Worker>('watermap')
  const { debugMode } = useDebug()
  const result = new Promise<Float32Array>((resolve) => {
    worker.value.addEventListener('message', (e) => {
      if (e.data) {
        resolve(e.data)
      }
    }, false)
  })
  worker.value.postMessage({ type: 'get', body: message, isDebug: debugMode.value })
  return result
}

/**
 * Get heightmap in Float32Array.
 * @param mapType default 'cs1'
 * @return Promise\<Float32Array\>
 */
export const getWaterMap = async (mapType: MapType = 'cs1') => {
  try {
    const { settings } = useMapbox().value
    const config = useRuntimeConfig()
    const token = settings.gridInfo === 'cs1' ? config.public.token : (settings.accessToken || config.public.token)
    const data: GenerateMapOption = {
      mapType,
      settings,
      token,
    }
    const generateMapOption = JSON.parse(JSON.stringify(data))
    const result = await getWaterMapData(generateMapOption)
    return result
  } catch (error) {
    console.error('An error occurred in getWaterMap:', error)
    throw error
  }
}

export const initGetWaterMapWorker = (waterCanvas: OffscreenCanvas, littCanvas: OffscreenCanvas, cornerCanvas: OffscreenCanvas) => {
  const worker = useState('watermap', () => {
    return new GetWaterMapWorker()
  })
  const canvases = [waterCanvas, littCanvas, cornerCanvas]
  worker.value.postMessage({ type: 'initialize', canvases }, canvases)
}
