import GetHeightMapWorker from '~/workers/getHeightMapWorker.ts?worker'
import type { MapType, GenerateMapOption } from '~/types/types'

const getHeightMapData = (message: any) => {
  const worker = useState<Worker>('heightmap')
  const result = new Promise<Float32Array>((resolve) => {
    worker.value.addEventListener('message', (e) => {
      if (e.data) {
        resolve(e.data)
      }
    }, false)
  })
  worker.value.postMessage({ type: 'get', body: message })
  return result
}

/**
 * Get heightmap in Float32Array.
 * @param mapType default 'cs1'
 * @return Promise\<Float32Array\>
 */
export const getHeightMap = async (mapType: MapType = 'cs1') => {
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
    const result = await getHeightMapData(generateMapOption)
    return result
  } catch (error) {
    console.error('An error occurred in getHeightMap:', error)
    throw error
  }
}

export const initGetHeightMapWorker = (offscreenCanvas: OffscreenCanvas) => {
  const worker = useState('heightmap', () => {
    return new GetHeightMapWorker()
  })
  worker.value.postMessage({ type: 'initialize', canvas: offscreenCanvas }, [offscreenCanvas])
}
