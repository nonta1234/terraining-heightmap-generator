import CalcMapWorker from '~/workers/calcCitiesMap.ts?worker' // eslint-disable-line
import type { MapType } from '~/types/types'

type MessageData = {
  scaleFactor: number;
  tmpHeightMap: Float32Array;
  waterMap: Float32Array;
  waterwayMap: Float32Array;
  seaLevel: number;
  vertScale: number;
  smoothing: number;
  smthThres: number;
  smthFade: number;
  smoothCount: number;
  sharpen: number;
  shrpThres: number;
  shrpFade: number;
  depth: number;
  streamDepth: number;
  mapSizePixels: number;
  mapSizePixelsWithBuffer: number;
  noise: number;
  noiseGrid: number;
}


const calcMap = (data: MessageData) => {
  return new Promise<Uint8Array>((resolve) => {
    const worker = new CalcMapWorker()
    worker.postMessage(data, [data.tmpHeightMap.buffer, data.waterMap.buffer, data.waterwayMap.buffer])
    worker.addEventListener('message', (e) => {
      if (e.data) {
        resolve(e.data)
        worker.terminate()
      }
    }, false)
  })
}


export const getCitiesMapBak = async (mapType: MapType, minHeight?: number, maxHeight?: number) => {
  try {
    const mapbox = useMapbox()

    const heightMapTime0 = window.performance.now()
    const tmpHeightMap = await getHeightMap(mapType)
    const heightMapTime = window.performance.now() - heightMapTime0
    console.log('heightmap:', heightMapTime.toFixed(1) + 'ms')

    const waterMapTime0 = window.performance.now()
    const { waterMap, waterwayMap } = await getWaterMap(mapType)
    const waterMapTime = window.performance.now() - waterMapTime0
    console.log('watermap:', waterMapTime.toFixed(1) + 'ms')

    let minH: number | undefined
    let maxH: number | undefined
    if (!minHeight || !maxHeight) {
      const { min, max } = getMinMaxHeight(tmpHeightMap)
      minH = min
      maxH = max
    } else {
      minH = minHeight
      maxH = maxHeight
    }

    if (mapbox.value.settings.adjLevel) {
      mapbox.value.settings.seaLevel = minH
    }
    adjustElevation(maxH)

    const messageData: MessageData = {
      scaleFactor: mapbox.value.settings.gridInfo === 'cs2' ? mapbox.value.settings.elevationScale / 65535 : 0.015625,
      tmpHeightMap,
      waterMap,
      waterwayMap,
      seaLevel: mapbox.value.settings.seaLevel,
      vertScale: mapbox.value.settings.vertScale,
      smoothing: mapbox.value.settings.smoothing,
      smthThres: mapbox.value.settings.smthThres,
      smthFade: mapbox.value.settings.smthFade,
      sharpen: mapbox.value.settings.sharpen,
      shrpThres: mapbox.value.settings.shrpThres,
      shrpFade: mapbox.value.settings.shrpFade,
      depth: mapbox.value.settings.depth,
      streamDepth: mapbox.value.settings.streamDepth,
      mapSizePixels: mapSpec[mapbox.value.settings.gridInfo].mapPixels,
      mapSizePixelsWithBuffer: mapSpec[mapbox.value.settings.gridInfo].mapPixels + 4,
      noise: mapbox.value.settings.noise,
      noiseGrid: mapbox.value.settings.noiseGrid,
      smoothCount: mapbox.value.settings.smoothCount,
    }

    const citiesMap = await calcMap(messageData)

    return { citiesMap, minH, maxH }
  } catch (error) {
    console.error('An error occurred in getCitiesMap:', error)
    throw error
  }
}
