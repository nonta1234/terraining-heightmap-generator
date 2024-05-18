import GenerateCitiesMapWorker from '~/assets/workers/generateCitiesMapWorker.ts?worker'
import type { MapType, Settings, GenerateMapOption } from '~/types/types'

const generateCitiesMapData = (mapType: MapType, settings: Settings, heightmap: Float32Array, waterMap: Float32Array, waterWayMap: Float32Array) => {
  const data: GenerateMapOption = {
    mapType,
    settings,
  }
  const generateMapOption = JSON.parse(JSON.stringify(data))
  const worker = new GenerateCitiesMapWorker()
  const result = new Promise<Uint8Array>((resolve) => {
    worker.addEventListener('message', (e) => {
      if (e.data) {
        resolve(e.data)
        worker.terminate()
      }
    }, { once: true })
  })
  worker.postMessage({ body: generateMapOption, heightmap, waterMap, waterWayMap }, [heightmap.buffer, waterMap.buffer, waterWayMap.buffer])
  return result
}

/**
 * Generate CitiesMap by combining heightmap, waterMap and waterWayMap.
 * @param mapType MapType
 * @param heightmap Float32Array
 * @param waterMap Float32Array
 * @param waterWayMap Float32Array
 * @returns Promise\<Uint8Array\>
 */
export const generateCitiesMap = async (mapType: MapType = 'cs1', heightmap: Float32Array, waterMap: Float32Array, waterWayMap: Float32Array) => {
  try {
    const { settings } = useMapbox().value
    const result = await generateCitiesMapData(mapType, settings, heightmap, waterMap, waterWayMap)
    return result
  } catch (error) {
    console.error('An error occurred in getCitiesMap:', error)
    throw error
  }
}
