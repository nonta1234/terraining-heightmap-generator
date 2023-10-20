import CalcMapWorker from '~/workers/calcCitiesMap.js?worker'  // eslint-disable-line

type MessageData = {
  tmpHeightMap: Float64Array;
  waterMap: Float64Array;
  waterwayMap: Float64Array;
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


export const getCitiesMap = async () => {
  try {
    const mapbox = useMapbox()
    const tmpHeightMap = await getHeightMap()
    const { waterMap, waterwayMap } = await getWaterMap()
    const { min, max } = getMinMaxHeight(tmpHeightMap)

    if (mapbox.value.settings.adjLevel) {
      mapbox.value.settings.seaLevel = min
    }
    adjustElevation(max)

    const messageData: MessageData = {
      tmpHeightMap: new Float64Array(tmpHeightMap),
      waterMap: new Float64Array(waterMap),
      waterwayMap: new Float64Array(waterwayMap),
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

    return citiesMap
  } catch (error) {
    console.error('An error occurred in getCitiesMap:', error)
    throw error
  }
}
