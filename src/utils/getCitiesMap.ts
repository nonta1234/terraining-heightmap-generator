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

    const tileCanvas = ref<HTMLCanvasElement>()
    tileCanvas.value = document.getElementById('tile-canvas') as HTMLCanvasElement
    const osTileCanvas = tileCanvas.value.transferControlToOffscreen()
    canvases.push(osTileCanvas)

    const littCanvas = ref<HTMLCanvasElement>()
    littCanvas.value = document.getElementById('litt-canvas') as HTMLCanvasElement
    const osLittCanvas = littCanvas.value.transferControlToOffscreen()
    canvases.push(osLittCanvas)

    const radialCanvas = document.createElement('canvas') as HTMLCanvasElement
    const osRadialCanvas = radialCanvas.transferControlToOffscreen()
    canvases.push(osRadialCanvas)

    const waterCanvas = ref<HTMLCanvasElement>()
    waterCanvas.value = document.getElementById('water-canvas') as HTMLCanvasElement
    const osWaterCanvas = waterCanvas.value.transferControlToOffscreen()
    canvases.push(osWaterCanvas)

    return await generateMap({ data: generateMapOption, canvases })
  } catch (error) {
    console.error('An error occurred in getCitiesMap:', error)
    throw error
  }
}
