import GenerateMapWorker from '~/workers/generateMap.ts?worker'
import type { MapType, GenerateMapOption, MessageData } from '~/types/types'

const generateMap = (message: MessageData) => {
  return new Promise<Uint8Array>((resolve) => {
    const worker = new GenerateMapWorker()
    worker.postMessage(message, message.canvases)
    worker.addEventListener('message', (e) => {
      if (e.data) {
        resolve(e.data)
        worker.terminate()
      }
    }, { once: true })
  })
}

export const getCitiesMap = async (mapType: MapType) => {
  try {
    const mapbox = useMapbox()
    const config = useRuntimeConfig()
    const data: GenerateMapOption = {
      mapType,
      settings: mapbox.value.settings,
      scaleFactor: mapbox.value.settings.gridInfo === 'cs2' ? (mapbox.value.settings.elevationScale / 65535) : 0.015625,
      token: mapbox.value.settings.accessToken || config.public.token,
    }
    const generateMapOption = JSON.parse(JSON.stringify(data))

    const canvases = []
    const canvasesData = useState<OffscreenCanvas[]>('canvases').value
    for (let i = 0; i < 4; i++) {
      canvases.push(canvasesData[i])
    }

    return await generateMap({ data: generateMapOption, canvases })
  } catch (error) {
    console.error('An error occurred in getCitiesMap:', error)
    throw error
  }
}
