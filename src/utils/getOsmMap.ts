import GetOsmMapWorker from '~/assets/workers/getOsmMapWorker.ts?worker'
import type { MapType, GenerateMapOption, Settings } from '~/types/types'

const getOsmMapData = (mapType: MapType, settings: Settings) => {
  const data: GenerateMapOption = {
    mapType,
    settings,
  }
  const generateMapOption = JSON.parse(JSON.stringify(data))
  const worker = new GetOsmMapWorker()
  const result = new Promise<string>((resolve) => {
    worker.addEventListener('message', (e) => {
      if (e.data) {
        const decoder = new TextDecoder()
        const decodedOsm = decoder.decode(new Uint8Array(e.data))
        resolve(decodedOsm)
        worker.terminate()
      }
    }, { once: true })
  })
  worker.postMessage(generateMapOption)
  return result
}

export const getOsmMap = async () => {
  try {
    const { settings } = useMapbox().value
    const result = await getOsmMapData(settings.gridInfo, settings)
    return result
  } catch (error) {
    console.error('An error occurred in getOsmMap:', error)
    throw error
  }
}
